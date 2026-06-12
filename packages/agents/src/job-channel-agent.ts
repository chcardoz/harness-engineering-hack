import { slugify } from '@yougrep/config';
import {
  appendChannelMessage,
  getJobChannel,
  getListingForChannel,
  getOrganizationById,
  listApplicationsForChannel,
  listCandidates,
  listConnectors,
  listResultPackagesForChannel,
  publishPosting,
  recordAudit,
  saveInterviewPlan,
  updateJobChannel,
  upsertJobListing,
  type Candidate,
} from '@yougrep/domain';
import { doc, node, type OpenUIDocument, type OpenUINode } from '@yougrep/openui/contract';
import { distillJobBrief, gatherConnectorContext, type DistilledBrief } from './connector-context';
import { classifyIntent } from './intent';
import { JOB_CHANNEL_SYSTEM_PROMPT } from './prompts';
import { buildInterviewPlanDraft } from './rubric';
import { narrate, withAgentRun } from './runtime';
import type { AgentTurn, JobChannelInput, JobChannelIntent } from './types';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function connectorStatusNode(
  connectors: { provider: string; status: string; detail?: string }[],
): OpenUINode {
  return node('ConnectorStatus', {
    connectors: connectors.map((c) => ({
      provider: c.provider,
      status: (['connected', 'syncing', 'error', 'disconnected'].includes(c.status)
        ? c.status
        : 'connected') as 'connected' | 'syncing' | 'error' | 'disconnected',
      detail: c.detail,
    })),
  });
}

function briefNode(brief: DistilledBrief): OpenUINode {
  return node('JobBriefCard', {
    title: brief.title,
    summary: brief.summary,
    mustHaves: brief.mustHaves,
    sourcedFrom: brief.sourcedFrom,
  });
}

function nextActions(
  actions: {
    id: string;
    label: string;
    kind?: 'primary' | 'secondary' | 'danger';
    confirm?: boolean;
  }[],
  prompt?: string,
): OpenUINode {
  return node('NextActionButtons', {
    prompt,
    actions: actions.map((a) => ({
      id: a.id,
      label: a.label,
      kind: a.kind ?? 'secondary',
      confirm: a.confirm ?? false,
    })),
  });
}

/** Pipeline counts for the channel, derived from application stages. */
async function pipelineNode(organizationId: string, jobChannelId: string): Promise<OpenUINode> {
  const apps = await listApplicationsForChannel(organizationId, jobChannelId);
  const order = ['applied', 'interviewing', 'interviewed', 'shortlisted', 'rejected'];
  const counts = new Map<string, number>(order.map((s) => [s, 0]));
  for (const a of apps) counts.set(a.stage, (counts.get(a.stage) ?? 0) + 1);
  return node('PipelineChart', {
    stages: order.map((label) => ({ label, count: counts.get(label) ?? 0 })),
  });
}

function candidateName(map: Map<string, Candidate>, id: string): string {
  return map.get(id)?.name ?? map.get(id)?.email ?? 'Candidate';
}

/* ── Intent handlers ─────────────────────────────────────────────────────── */

interface HandlerCtx {
  input: JobChannelInput;
  brief: DistilledBrief;
  connectors: { provider: string; status: string }[];
}

async function handleOverview(
  ctx: HandlerCtx,
): Promise<{ nodes: OpenUINode[]; effects: string[] }> {
  return {
    nodes: [
      briefNode(ctx.brief),
      connectorStatusNode(ctx.connectors),
      nextActions(
        [
          { id: 'draft_listing', label: 'Draft the listing', kind: 'primary' },
          { id: 'build_interview', label: 'Plan the interview' },
          { id: 'review_candidates', label: 'Review candidates' },
        ],
        'Where do you want to start?',
      ),
    ],
    effects: [],
  };
}

async function handleDraftListing(
  ctx: HandlerCtx,
): Promise<{ nodes: OpenUINode[]; effects: string[] }> {
  const { input, brief } = ctx;
  const listing = await upsertJobListing({
    organizationId: input.organizationId,
    jobChannelId: input.jobChannelId,
    title: brief.title,
    summary: brief.summary,
    employmentType: 'Full-time',
    location: 'Remote',
    responsibilities: [
      'Own reliability and performance of the production Postgres fleet',
      'Lead replication, backup/recovery, and capacity planning',
      'Partner with product teams on schema and query design',
    ],
    requirements: brief.mustHaves,
    niceToHaves: brief.niceToHaves,
    status: 'draft',
    createdByUserId: input.userId ?? null,
  });

  return {
    nodes: [
      node('JobListingDraft', {
        title: listing.title,
        location: listing.location ?? undefined,
        employmentType: listing.employmentType ?? undefined,
        summary: listing.summary ?? '',
        responsibilities: listing.responsibilities ?? [],
        requirements: listing.requirements ?? [],
        niceToHaves: listing.niceToHaves ?? [],
        listingId: listing.id,
      }),
      nextActions(
        [
          { id: 'publish', label: 'Publish to job board', kind: 'primary', confirm: true },
          { id: 'build_interview', label: 'Plan the interview' },
          { id: 'refine_listing', label: 'Refine' },
        ],
        'Looks good? Publishing posts it to your public board.',
      ),
    ],
    effects: [`drafted listing "${listing.title}"`],
  };
}

async function handleBuildInterview(
  ctx: HandlerCtx,
): Promise<{ nodes: OpenUINode[]; effects: string[] }> {
  const { input, brief } = ctx;
  const draft = buildInterviewPlanDraft(brief);
  await saveInterviewPlan({
    organizationId: input.organizationId,
    jobChannelId: input.jobChannelId,
    roleBrief: draft.roleBrief,
    rubric: draft.rubric,
    questionPlan: draft.questionPlan.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      payload: { ...q.payload, criterionKey: q.criterionKey },
    })),
  });

  return {
    nodes: [
      node('JobBriefCard', {
        title: 'Interview plan ready',
        summary: `${draft.questionPlan.length} questions across ${draft.rubric.criteria.length} rubric criteria. The interview agent will use only this distilled brief — never your private channel context.`,
        mustHaves: draft.rubric.criteria.map((c) => `${c.label} (${Math.round(c.weight * 100)}%)`),
      }),
      nextActions(
        [
          { id: 'publish', label: 'Publish & open for interviews', kind: 'primary', confirm: true },
          { id: 'draft_listing', label: 'Back to listing' },
        ],
        undefined,
      ),
    ],
    effects: [`built interview plan (${draft.questionPlan.length} questions)`],
  };
}

async function handleReviewCandidates(
  ctx: HandlerCtx,
): Promise<{ nodes: OpenUINode[]; effects: string[] }> {
  const { input } = ctx;
  const [packages, candidates] = await Promise.all([
    listResultPackagesForChannel(input.organizationId, input.jobChannelId),
    listCandidates(input.organizationId),
  ]);
  const byId = new Map(candidates.map((c) => [c.id, c]));

  if (packages.length === 0) {
    return {
      nodes: [
        node('JobBriefCard', {
          title: 'No completed interviews yet',
          summary:
            'Once candidates apply from your job board and finish the interview, their evidence-backed scorecards show up here.',
          mustHaves: [],
        }),
        await pipelineNode(input.organizationId, input.jobChannelId),
      ],
      effects: [],
    };
  }

  const sorted = [...packages].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
  const cards: OpenUINode[] = sorted.slice(0, 5).map((p) =>
    node('CandidateCard', {
      candidateId: p.candidateId,
      name: candidateName(byId, p.candidateId),
      headline: byId.get(p.candidateId)?.headline ?? undefined,
      overallScore: p.overallScore ?? undefined,
      recommendation: p.recommendation ?? undefined,
      strengths: p.strengths ?? [],
      concerns: p.concerns ?? [],
    }),
  );

  return {
    nodes: [
      await pipelineNode(input.organizationId, input.jobChannelId),
      ...cards,
      nextActions([{ id: 'compare_candidates', label: 'Compare top candidates', kind: 'primary' }]),
    ],
    effects: [],
  };
}

async function handleCompareCandidates(
  ctx: HandlerCtx,
): Promise<{ nodes: OpenUINode[]; effects: string[] }> {
  const { input } = ctx;
  const [packages, candidates] = await Promise.all([
    listResultPackagesForChannel(input.organizationId, input.jobChannelId),
    listCandidates(input.organizationId),
  ]);
  const byId = new Map(candidates.map((c) => [c.id, c]));

  if (packages.length < 2) {
    return handleReviewCandidates(ctx);
  }

  // Union of all rubric criteria across packages, preserving first-seen order.
  const critOrder: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const p of packages) {
    for (const rs of p.rubricScores ?? []) {
      if (!seen.has(rs.key)) {
        seen.add(rs.key);
        critOrder.push({ key: rs.key, label: rs.label });
      }
    }
  }

  const sorted = [...packages].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));

  return {
    nodes: [
      node('CandidateComparisonTable', {
        criteria: critOrder,
        candidates: sorted.slice(0, 4).map((p) => {
          const scores: Record<string, number> = {};
          for (const rs of p.rubricScores ?? []) scores[rs.key] = rs.score;
          return {
            candidateId: p.candidateId,
            name: candidateName(byId, p.candidateId),
            overallScore: p.overallScore ?? undefined,
            scores,
            note: p.recommendation ?? undefined,
          };
        }),
      }),
    ],
    effects: [],
  };
}

async function handlePublish(ctx: HandlerCtx): Promise<{ nodes: OpenUINode[]; effects: string[] }> {
  const { input, brief } = ctx;
  const confirmed = input.action?.confirmed === true;

  // Ensure there is a listing to publish.
  let listing = await getListingForChannel(input.organizationId, input.jobChannelId);
  if (!listing) {
    const drafted = await handleDraftListing(ctx);
    listing = await getListingForChannel(input.organizationId, input.jobChannelId);
    if (!listing) return drafted; // extremely unlikely; fall back to the draft view
  }

  const org = await getOrganizationById(input.organizationId);
  const orgSlug = org?.slug;
  const prospectiveSlug = slugify(listing.title);

  if (!confirmed) {
    // Confirmation gate — never publish without an explicit confirm.
    return {
      nodes: [
        node('ConfirmPublish', {
          title: listing.title,
          summary: listing.summary ?? brief.summary,
          orgSlug,
          jobSlug: prospectiveSlug,
          listingId: listing.id,
          note: 'This makes the role public on your job board and opens it for candidate interviews.',
        }),
      ],
      effects: [],
    };
  }

  // Confirmed: publish, ensure an interview plan exists, open the channel.
  const draft = buildInterviewPlanDraft(brief);
  await saveInterviewPlan({
    organizationId: input.organizationId,
    jobChannelId: input.jobChannelId,
    roleBrief: draft.roleBrief,
    rubric: draft.rubric,
    questionPlan: draft.questionPlan.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      payload: { ...q.payload, criterionKey: q.criterionKey },
    })),
  });

  const posting = await publishPosting({
    organizationId: input.organizationId,
    jobChannelId: input.jobChannelId,
    listing: {
      title: listing.title,
      location: listing.location,
      summary: listing.summary,
      jobListingId: listing.id,
      contentSnapshot: {
        summary: listing.summary,
        responsibilities: listing.responsibilities ?? [],
        requirements: listing.requirements ?? [],
        niceToHaves: listing.niceToHaves ?? [],
        employmentType: listing.employmentType,
        location: listing.location,
      },
    },
  });

  await upsertJobListing({
    organizationId: input.organizationId,
    jobChannelId: input.jobChannelId,
    title: listing.title,
    summary: listing.summary,
    status: 'published',
  });
  await updateJobChannel(input.organizationId, input.jobChannelId, { status: 'open' });
  await recordAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId ?? null,
    action: 'publish_posting',
    targetType: 'job_board_posting',
    targetId: posting.id,
    metadata: { slug: posting.slug, title: posting.title },
  });

  const boardUrl = orgSlug ? `/c/${orgSlug}/${posting.slug}` : undefined;
  return {
    nodes: [
      node('JobBriefCard', {
        title: `Published: ${posting.title}`,
        summary: boardUrl
          ? `Live on your job board at ${boardUrl}. Candidates can now apply and interview.`
          : 'Live on your job board. Candidates can now apply and interview.',
        mustHaves: [],
      }),
      nextActions([{ id: 'review_candidates', label: 'Watch for candidates', kind: 'primary' }]),
    ],
    effects: [`published posting "${posting.title}" (/${posting.slug})`],
  };
}

function handleHelp(): { nodes: OpenUINode[]; effects: string[] } {
  return {
    nodes: [
      node('JobBriefCard', {
        title: 'What this channel agent does',
        summary:
          'I read your connected context (Notion, GitHub, Slack), draft the public listing, ' +
          'plan a fair scored interview, and rank candidates with evidence. Publishing and ' +
          'outreach always require your explicit confirmation.',
        mustHaves: [
          'Draft & refine the listing',
          'Plan the interview rubric',
          'Publish to your owned job board',
          'Review & compare candidates',
        ],
      }),
      nextActions([
        { id: 'draft_listing', label: 'Draft the listing', kind: 'primary' },
        { id: 'build_interview', label: 'Plan the interview' },
      ]),
    ],
    effects: [],
  };
}

/* ── Reply prose per intent ──────────────────────────────────────────────── */

function fallbackProse(intent: JobChannelIntent, brief: DistilledBrief): string {
  switch (intent) {
    case 'draft_listing':
      return `Here's a first draft of the ${brief.title} listing, pulled from your connected context. Review it and we can refine or publish.`;
    case 'build_interview':
      return `I've planned a structured interview for ${brief.title}. The interview agent only ever sees this distilled brief and rubric — never your private channel.`;
    case 'review_candidates':
      return `Here's where the pipeline stands. Scorecards are evidence-backed from the interview transcripts.`;
    case 'compare_candidates':
      return `Top candidates side by side, scored against the rubric.`;
    case 'publish':
      return `Ready to publish ${brief.title} to your job board — confirm and it goes live with interviews open.`;
    case 'help':
      return `I'm the agent for this role. Here's how I can help.`;
    case 'overview':
    default:
      return `This channel is for ${brief.title}. I've distilled the role from your connected context — here's the brief.`;
  }
}

/* ── Entry point ─────────────────────────────────────────────────────────── */

/**
 * Run one turn of the job-channel agent. Persists the assistant message + an
 * agent_runs trace, and returns the turn. The caller is responsible for having
 * already persisted the recruiter's own message.
 */
export async function runJobChannelAgent(input: JobChannelInput): Promise<AgentTurn> {
  const channel = await getJobChannel(input.organizationId, input.jobChannelId);
  if (!channel) throw new Error('Job channel not found');

  const intent = classifyIntent(input.message, input.action);

  const handle = await withAgentRun(
    {
      agentType: 'job-channel',
      organizationId: input.organizationId,
      jobChannelId: input.jobChannelId,
    },
    async () => {
      const [ctxRaw, connectors] = await Promise.all([
        gatherConnectorContext(input.organizationId, channel.name),
        listConnectors(input.organizationId),
      ]);
      const brief = distillJobBrief(ctxRaw);
      // Prefer the channel's own name as the brief title once it's set.
      if (channel.name && channel.name.trim()) brief.title = channel.name;

      const hctx: HandlerCtx = { input, brief, connectors };

      let out: { nodes: OpenUINode[]; effects: string[] };
      switch (intent) {
        case 'draft_listing':
          out = await handleDraftListing(hctx);
          break;
        case 'build_interview':
          out = await handleBuildInterview(hctx);
          break;
        case 'review_candidates':
          out = await handleReviewCandidates(hctx);
          break;
        case 'compare_candidates':
          out = await handleCompareCandidates(hctx);
          break;
        case 'publish':
          out = await handlePublish(hctx);
          break;
        case 'help':
          out = handleHelp();
          break;
        case 'overview':
        default:
          out = await handleOverview(hctx);
          break;
      }

      const text = await narrate({
        systemPrompt: JOB_CHANNEL_SYSTEM_PROMPT,
        userPrompt: `Recruiter said: "${input.message}". Intent: ${intent}. Role: ${brief.title}. Reply in one or two concise sentences.`,
        fallback: fallbackProse(intent, brief),
      });

      const document: OpenUIDocument | null = out.nodes.length ? doc(...out.nodes) : null;
      return { result: { text, document, effects: out.effects }, toolCalls: out.effects };
    },
  );

  const { text, document, effects } = handle.result;

  const message = await appendChannelMessage({
    organizationId: input.organizationId,
    jobChannelId: input.jobChannelId,
    role: 'assistant',
    content: text,
    openui: document ?? null,
    agentRunId: handle.agentRunId,
  });

  return {
    messageId: message.id,
    agentRunId: handle.agentRunId,
    text,
    openui: document,
    intent,
    sideEffects: effects,
  };
}
