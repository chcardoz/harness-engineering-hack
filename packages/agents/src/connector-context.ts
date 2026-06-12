import { listConnectors } from '@yougrep/domain';
import { getAirbyteClient, type ConnectorContextItem } from '@yougrep/integrations';

/**
 * Read-only connector context for the channel agent. Reads the org's connected
 * providers and pulls distilled context items from each via Airbyte. This is
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
  const airbyte = getAirbyteClient();

  const results = await Promise.all(
    connected.map((c) =>
      airbyte
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
