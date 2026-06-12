import { modeFor } from '@yougrep/config';
import { listConnectors } from '@yougrep/domain';
import {
  composioUserId,
  getComposioClient,
  TIER1_TOOLKITS,
  type ComposioToolkit,
  type ConnectorContextItem,
} from '@yougrep/integrations';
import { runToolLoop, type AgentTool } from './tool-loop';

/**
 * Read-only connector context for the channel agent. Reads the org's connected
 * providers and pulls distilled context items from each via Composio. This is
 * the recruiter-side context; it is NEVER passed verbatim to the interview
 * agent — only a distilled brief crosses that boundary.
 */

export interface ConnectorContext {
  items: ConnectorContextItem[];
  connectedProviders: string[];
}

export async function gatherConnectorContext(
  organizationId: string,
  query?: string,
): Promise<ConnectorContext> {
  const connectors = await listConnectors(organizationId);
  const connected = connectors.filter((c) => c.status === 'connected' || c.status === 'syncing');
  const composio = getComposioClient();

  // Live mode: drive the org's real connected accounts via the agent tool-loop
  // so the brief is grounded in actual GitHub/Notion/Linear content. This is the
  // recruiter-side context only — the interview agent never receives these tools
  // or their output, just the distilled brief downstream.
  const liveToolkits = connected
    .map((c) => c.provider)
    .filter((p): p is ComposioToolkit => (TIER1_TOOLKITS as string[]).includes(p));
  if (modeFor('composio') === 'live' && liveToolkits.length > 0) {
    try {
      const handles = await composio.getAgentTools({
        userId: composioUserId(organizationId),
        toolkits: liveToolkits,
      });
      const tools: AgentTool[] = handles.map((h) => ({ def: h.def, execute: h.execute }));
      const loop = await runToolLoop({
        systemPrompt:
          'You are a hiring research assistant. Use the connected tools to gather concrete, ' +
          'sourced facts about a role and the team hiring for it. Be terse and factual.',
        userPrompt:
          `Gather context for the role "${query ?? 'this opening'}". Look across the connected ` +
          'sources (repos, docs, issues) for the responsibilities, required skills, tech stack, ' +
          'and team scope. Summarize as 3–6 short factual bullet points.',
        tools,
        fallback: '',
        maxIterations: 6,
      });
      if (loop.text.trim()) {
        return {
          items: [
            {
              title: query ?? 'Role context',
              snippet: loop.text.trim(),
              source: liveToolkits.join('+'),
            },
          ],
          connectedProviders: connected.map((c) => c.provider),
        };
      }
    } catch {
      // Fall through to readContext (empty in live mode) so a turn never fails
      // just because a connector call did.
    }
  }

  const results = await Promise.all(
    connected.map((c) =>
      composio
        .readContext({ provider: c.provider, organizationId, query })
        .then((r) => r.items)
        .catch(() => [] as ConnectorContextItem[]),
    ),
  );

  return {
    items: results.flat(),
    connectedProviders: connected.map((c) => c.provider),
  };
}

/** A distilled, candidate-safe brief derived from raw connector context. */
export interface DistilledBrief {
  title: string;
  summary: string;
  mustHaves: string[];
  niceToHaves: string[];
  sourcedFrom: string[];
  /** Compensation hint if found in context (recruiter-only — not for candidates). */
  compNote?: string;
}

const POSTGRES_MUST_HAVES = [
  '5+ years operating Postgres in production',
  'Query optimisation with EXPLAIN ANALYZE and indexing strategy (BRIN, GIN, partial)',
  'Logical and streaming replication, point-in-time recovery',
  'Connection pooling at scale (PgBouncer, transaction mode)',
  'Operational ownership: on-call, incident response, postmortems',
];

const POSTGRES_NICE_TO_HAVES = [
  'pgvector / PGVector for AI workloads',
  'Open-source Postgres extension or tooling contributions',
  'Experience at >100 GB cluster scale',
];

/**
 * Distill connector context into a role brief. Deterministic: when the context
 * matches the Postgres scenario we shape a rich brief; otherwise we summarise
 * whatever titles/snippets were returned. The summary is safe to hand to the
 * interview agent (it omits compensation and internal Slack chatter).
 */
export function distillJobBrief(ctx: ConnectorContext): DistilledBrief {
  const titles = ctx.items.map((i) => i.title.toLowerCase());
  const looksPostgres = titles.some((t) => t.includes('postgres'));

  const sourcedFrom = Array.from(new Set(ctx.items.map((i) => i.source)));

  if (looksPostgres) {
    return {
      title: 'Senior Postgres Engineer',
      summary:
        'Own the production data platform: multiple Postgres clusters (OLTP, analytics replica, ' +
        'and a pgvector cluster for ML features). The role is hands-on with replication, query ' +
        'performance, and operational reliability, and participates in on-call and incident review.',
      mustHaves: POSTGRES_MUST_HAVES,
      niceToHaves: POSTGRES_NICE_TO_HAVES,
      sourcedFrom,
      compNote: ctx.items.find((i) => i.title.toLowerCase().includes('compensation'))?.snippet,
    };
  }

  // Generic fallback: build a brief from whatever context we have.
  const first = ctx.items[0];
  return {
    title: first?.title ?? 'New Role',
    summary:
      ctx.items
        .slice(0, 2)
        .map((i) => i.snippet)
        .join(' ')
        .slice(0, 400) || 'Connect Notion, GitHub, or Slack to give this channel context.',
    mustHaves: [],
    niceToHaves: [],
    sourcedFrom,
  };
}
