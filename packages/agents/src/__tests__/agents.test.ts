/**
 * Behavioral tests for @yougrep/agents.
 *
 * Covers the two pure units (scoreAnswer, classifyIntent) and the two
 * long-running agents end-to-end against a real PGlite database:
 *  - the job-channel (recruiter) agent: overview → draft → publish gate
 *  - the interview (candidate) agent: consent → questions → completion → result
 *
 * Runs with INTEGRATIONS_MODE=stub (set by the root vitest config), so the
 * notion/github/slack connectors return the Senior Postgres Engineer fixtures
 * and the briefs/plans are deterministic.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, ensureMigrated, organization } from '@yougrep/db';
import {
  createJobChannel,
  upsertConnector,
  upsertCandidate,
  createApplication,
  createInterviewSession,
  getListingForChannel,
  listOrgPostings,
  getPlanForChannel,
  listResultPackagesForChannel,
  getApplication,
  getInterviewSession,
} from '@yougrep/domain';
import type { OpenUIDocument, OpenUINode } from '@yougrep/openui';
import {
  runJobChannelAgent,
  classifyIntent,
  scoreAnswer,
  startInterviewSession,
  submitInterviewAnswer,
} from '../index';
import type { PlannedQuestion } from '../index';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Find the first node in a document with the given component name. */
function findNode(doc: OpenUIDocument | null, component: string): OpenUINode | undefined {
  return doc?.nodes.find((n) => n.component === component);
}

/** True if the document contains a node with the given component name. */
function hasNode(doc: OpenUIDocument | null, component: string): boolean {
  return Boolean(findNode(doc, component));
}

function selfRatingQuestion(): PlannedQuestion {
  return {
    id: 'q_self_rating',
    kind: 'self_rating',
    criterionKey: 'communication',
    prompt: 'How would you rate yourself?',
    payload: { skill: 'Postgres', min: 1, max: 5 },
  };
}

function queryPerfQuestion(): PlannedQuestion {
  return {
    id: 'q_sql',
    kind: 'sql',
    criterionKey: 'query_perf',
    prompt: 'Optimize this query.',
    payload: {},
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Setup: one org, three connectors, one Senior Postgres Engineer channel.
// ──────────────────────────────────────────────────────────────────────────────

let orgId: string;
let channelId: string;
const orgSlug = `org-agents-${crypto.randomUUID()}`;

beforeAll(async () => {
  await ensureMigrated();
  const db = getDb();

  const [org] = await db
    .insert(organization)
    .values({ name: 'Acme Corp', slug: orgSlug })
    .returning();
  if (!org) throw new Error('Failed to seed org');
  orgId = org.id;

  // Connected connectors → gatherConnectorContext returns the rich fixtures.
  await upsertConnector({ organizationId: orgId, provider: 'notion', status: 'connected' });
  await upsertConnector({ organizationId: orgId, provider: 'github', status: 'connected' });
  await upsertConnector({ organizationId: orgId, provider: 'slack', status: 'connected' });

  const channel = await createJobChannel({
    organizationId: orgId,
    name: 'Senior Postgres Engineer',
  });
  channelId = channel.id;
});

// ──────────────────────────────────────────────────────────────────────────────
// scoreAnswer — pure unit
// ──────────────────────────────────────────────────────────────────────────────

describe('scoreAnswer', () => {
  it('returns the clamped numeric rating for a self_rating question', () => {
    const q = selfRatingQuestion();
    expect(scoreAnswer(q, 4).score).toBe(4);
    // Out-of-range high is clamped to the 1–5 ceiling.
    expect(scoreAnswer(q, 9).score).toBe(5);
    // Out-of-range low is clamped to the floor.
    expect(scoreAnswer(q, -3).score).toBe(1);
    // Non-numeric / NaN is damped to a sensible middle (3).
    expect(scoreAnswer(q, 'not a number').score).toBe(3);
    // Numeric strings coerce.
    expect(scoreAnswer(q, '4').score).toBe(4);
  });

  it('scores a substantive, on-topic answer higher than an empty one', () => {
    const q = queryPerfQuestion();

    const strong = scoreAnswer(
      q,
      'I would run EXPLAIN ANALYZE to inspect the plan, then add a partial ' +
        'index on the predicate columns instead of relying on a full btree index. ' +
        'That converts the seq scan into an index scan and keeps the queue-drain ' +
        'query fast even as the table grows to fifty million rows. I would also ' +
        'verify the plan choice after analyze so the planner has fresh statistics.',
    );
    const empty = scoreAnswer(q, '');
    const oneWord = scoreAnswer(q, 'yes');

    expect(strong.score).toBeGreaterThan(empty.score);
    expect(strong.score).toBeGreaterThan(oneWord.score);
    // Empty / one-word answers floor at 1.
    expect(empty.score).toBe(1);
    expect(oneWord.score).toBe(1);
    // The strong answer surfaced its key concepts as evidence.
    expect(strong.evidence.toLowerCase()).toContain('index');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// classifyIntent — pure unit
// ──────────────────────────────────────────────────────────────────────────────

describe('classifyIntent', () => {
  it('routes free-text messages to the right intent', () => {
    expect(classifyIntent('draft the listing')).toBe('draft_listing');
    expect(classifyIntent('publish it')).toBe('publish');
    expect(classifyIntent('compare the candidates')).toBe('compare_candidates');
    expect(classifyIntent('who applied')).toBe('review_candidates');
  });

  it('lets an explicit action override free text', () => {
    expect(
      classifyIntent('whatever', { actionId: 'build_interview', component: 'NextActionButtons' }),
    ).toBe('build_interview');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Job-channel agent — integration
// ──────────────────────────────────────────────────────────────────────────────

describe('runJobChannelAgent', () => {
  it('overview returns a JobBriefCard + NextActionButtons and persists a message + run', async () => {
    const turn = await runJobChannelAgent({
      organizationId: orgId,
      jobChannelId: channelId,
      message: 'give me an overview',
    });

    expect(turn.intent).toBe('overview');
    expect(hasNode(turn.openui, 'JobBriefCard')).toBe(true);
    expect(hasNode(turn.openui, 'NextActionButtons')).toBe(true);
    expect(turn.messageId).toBeTruthy();
    expect(turn.agentRunId).toBeTruthy();

    // The brief is the distilled Senior Postgres Engineer scenario.
    const brief = findNode(turn.openui, 'JobBriefCard');
    expect(brief?.props.title).toBe('Senior Postgres Engineer');
  });

  it('draft_listing produces a JobListingDraft and persists a listing', async () => {
    const turn = await runJobChannelAgent({
      organizationId: orgId,
      jobChannelId: channelId,
      message: 'draft the listing',
    });

    expect(turn.intent).toBe('draft_listing');
    expect(hasNode(turn.openui, 'JobListingDraft')).toBe(true);

    const listing = await getListingForChannel(orgId, channelId);
    expect(listing).not.toBeNull();
    expect(listing!.title).toBeTruthy();
  });

  it('publish requires explicit confirmation before creating a posting', async () => {
    // Unconfirmed publish → ConfirmPublish gate, NO posting created.
    const gate = await runJobChannelAgent({
      organizationId: orgId,
      jobChannelId: channelId,
      message: 'publish',
    });

    expect(gate.intent).toBe('publish');
    expect(hasNode(gate.openui, 'ConfirmPublish')).toBe(true);

    const beforeConfirm = await listOrgPostings(orgId);
    expect(beforeConfirm.filter((p) => p.jobChannelId === channelId)).toHaveLength(0);

    // Confirmed publish → posting created + interview plan ensured.
    const published = await runJobChannelAgent({
      organizationId: orgId,
      jobChannelId: channelId,
      message: 'publish',
      action: { actionId: 'publish', component: 'NextActionButtons', confirmed: true },
    });

    expect(published.intent).toBe('publish');

    const postings = await listOrgPostings(orgId);
    const channelPostings = postings.filter((p) => p.jobChannelId === channelId);
    expect(channelPostings.length).toBeGreaterThanOrEqual(1);
    expect(channelPostings[0]!.status).toBe('published');

    const plan = await getPlanForChannel(orgId, channelId);
    expect(plan).not.toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Interview agent — integration (depends on the published plan above)
// ──────────────────────────────────────────────────────────────────────────────

describe('interview agent', () => {
  let applicationId: string;
  let sessionId: string;

  beforeAll(async () => {
    // A plan must exist; the publish test created it. Guard defensively.
    let plan = await getPlanForChannel(orgId, channelId);
    if (!plan) {
      await runJobChannelAgent({
        organizationId: orgId,
        jobChannelId: channelId,
        message: 'plan the interview',
        action: { actionId: 'build_interview', component: 'NextActionButtons' },
      });
      plan = await getPlanForChannel(orgId, channelId);
    }
    if (!plan) throw new Error('Expected an interview plan to exist for the channel');

    const candidate = await upsertCandidate({
      organizationId: orgId,
      email: `candidate-${crypto.randomUUID()}@example.com`,
      name: 'Dana DB',
      headline: 'Database engineer',
    });
    const application = await createApplication({
      organizationId: orgId,
      candidateId: candidate.id,
      jobChannelId: channelId,
    });
    applicationId = application.id;

    const session = await createInterviewSession({
      organizationId: orgId,
      applicationId: application.id,
      candidateId: candidate.id,
      jobChannelId: channelId,
      planId: plan.id,
    });
    sessionId = session.id;
  });

  it('starts at the consent screen', async () => {
    const start = await startInterviewSession(orgId, sessionId);
    expect(hasNode(start.openui, 'ConsentNotice')).toBe(true);
    expect(start.step).toBe(-1);
    expect(start.done).toBe(false);
  });

  it('runs through consent → questions → completion and finalizes the result', async () => {
    // Consent → first question.
    const afterConsent = await submitInterviewAnswer(orgId, sessionId, {
      actionId: 'consent_given',
      component: 'ConsentNotice',
      value: true,
    });
    expect(afterConsent.done).toBe(false);
    // The first planned question for the Postgres role is the self-rating.
    expect(afterConsent.openui.nodes[0]!.component).toBe('SkillSelfRating');

    // Drive the rest of the interview. For the self-rating step send a number;
    // for every other step send a rich descriptive string. The current question
    // component is read off the returned document each turn.
    const richAnswer =
      'I would start by reproducing the issue and inspecting the plan with ' +
      'EXPLAIN ANALYZE. The trade-off here is between a partial index and a ' +
      'covering btree index; because the predicate is selective I would add a ' +
      'partial index. For replication I would batch the bulk write to avoid WAL ' +
      'amplification and replica lag, monitor with alerts, and add a statement ' +
      'timeout as a guardrail. I owned a similar incident end to end: detection ' +
      'via alert, mitigation by killing the runaway transaction and re-issuing in ' +
      'smaller batches, and a durable fix shipped afterward with a postmortem.';

    let current = afterConsent;
    let guard = 0;
    while (!current.done && guard < 12) {
      guard += 1;
      const component = current.openui.nodes[0]!.component;
      const value = component === 'SkillSelfRating' ? 4 : richAnswer;
      current = await submitInterviewAnswer(orgId, sessionId, {
        actionId: 'answer',
        component,
        value,
      });
    }

    expect(current.done).toBe(true);
    expect(hasNode(current.openui, 'InterviewComplete')).toBe(true);

    // Session is completed.
    const session = await getInterviewSession(orgId, sessionId);
    expect(session!.sessionStatus).toBe('completed');

    // A result package was finalized with a numeric overall + rubric scores.
    const packages = await listResultPackagesForChannel(orgId, channelId);
    expect(packages.length).toBeGreaterThanOrEqual(1);
    const pkg = packages.find((p) => p.applicationId === applicationId) ?? packages[0]!;
    expect(typeof pkg.overallScore).toBe('number');
    expect(pkg.rubricScores).toBeTruthy();
    expect(pkg.rubricScores!.length).toBeGreaterThan(0);

    // The application advanced to 'interviewed'.
    const application = await getApplication(orgId, applicationId);
    expect(application!.stage).toBe('interviewed');
  });
});
