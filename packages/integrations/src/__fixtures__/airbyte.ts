import type { ConnectorContextItem } from '../airbyte';

/**
 * Deterministic fixture context for stub mode.
 * Scenario: "Acme Corp" is hiring a Senior Postgres Engineer.
 */

export const notionFixtures: ConnectorContextItem[] = [
  {
    title: 'Senior Postgres Engineer — Job Requirements',
    snippet:
      'We are looking for a Senior Postgres Engineer to own our data platform. ' +
      'Requirements: 5+ years with Postgres, deep knowledge of query optimisation, ' +
      'vacuuming, indexing strategies (BRIN, GIN, partial), and connection pooling (PgBouncer). ' +
      'Experience with logical replication, streaming replication, and point-in-time recovery. ' +
      'Familiarity with PGVector or pgvector extension for AI workloads is a strong plus. ' +
      'Comfortable with Postgres on cloud providers (AWS RDS, Supabase, or Render Postgres). ' +
      'Bonus: contributed to an open-source Postgres extension or tooling.',
    url: 'https://notion.so/acme/senior-postgres-engineer-jd',
    source: 'notion',
  },
  {
    title: 'Hiring Rubric — Postgres Depth',
    snippet:
      'Evaluation criteria: (1) Can describe MVCC and explain why it matters for long-running transactions. ' +
      '(2) Can walk through a slow query with EXPLAIN ANALYZE and propose at least two fixes. ' +
      '(3) Understands the trade-offs between logical and streaming replication. ' +
      '(4) Has operated Postgres at >100 GB scale. ' +
      '(5) Can describe at least one incident they resolved involving Postgres.',
    url: 'https://notion.so/acme/postgres-rubric',
    source: 'notion',
  },
  {
    title: 'Company Context — Acme Corp Engineering',
    snippet:
      'Acme Corp is a 60-person Series B fintech. The data platform team owns three production Postgres clusters ' +
      '(primary OLTP at ~250 GB, analytics read replica, and a PGVector cluster for ML features). ' +
      'Stack: Node.js + TypeScript backend, Next.js frontend, Postgres on Render, Redis for queues. ' +
      'Engineering culture values operational ownership — this role is on-call and expected to participate in incident review.',
    url: 'https://notion.so/acme/engineering-overview',
    source: 'notion',
  },
];

export const githubFixtures: ConnectorContextItem[] = [
  {
    title: 'acme/data-platform — Repository Overview',
    snippet:
      "Primary repo for Acme's data infrastructure. Contains: Postgres migration scripts (Flyway), " +
      'PgBouncer configs, monitoring dashboards (Grafana), and runbooks. ' +
      '47 open issues, 3 open PRs. Last commit: 2 days ago.',
    url: 'https://github.com/acme/data-platform',
    source: 'github',
  },
  {
    title: 'PR #312 — Add partial index on events(user_id) where processed = false',
    snippet:
      'Authored by @dana-db. Reduces queue-drain query time from 340 ms to 12 ms on a 50M-row table. ' +
      'Review notes: good understanding of partial indexes and predicate lock implications. ' +
      'Approved by two seniors. Merged 2026-06-10.',
    url: 'https://github.com/acme/data-platform/pull/312',
    source: 'github',
  },
  {
    title: 'PR #298 — Migrate connection pool from direct Postgres to PgBouncer',
    snippet:
      'Large refactor moving all services to PgBouncer in transaction mode. ' +
      'Discussion covers prepared-statement caveats in transaction pooling mode and the need to disable ' +
      'DISCARD ALL on checkout. Merged after 3 review rounds. Shows operational depth.',
    url: 'https://github.com/acme/data-platform/pull/298',
    source: 'github',
  },
  {
    title: 'Issue #401 — PGVector index build OOM on 768-dim embeddings at 2M rows',
    snippet:
      'Open issue: building an HNSW index on the embeddings table causes OOM on the 8 GB Render instance. ' +
      'Workaround: chunk index builds into 500k-row batches. ' +
      'Help wanted — a good interview conversation starter about large-scale PGVector operations.',
    url: 'https://github.com/acme/data-platform/issues/401',
    source: 'github',
  },
];

export const slackFixtures: ConnectorContextItem[] = [
  {
    title: '#hiring-postgres-engineer — Thread: defining the role',
    snippet:
      'CTO (@priya): "We really need someone who can own the replication setup end to end. ' +
      'The read replica lag last week was unacceptable." ' +
      'Engineering Manager (@james): "Agreed — I want the rubric to emphasise incident response. ' +
      'Anyone who has moved a live Postgres cluster with zero downtime is worth a second round."',
    url: 'https://acme.slack.com/archives/C08XYZ/p1718000000000000',
    source: 'slack',
  },
  {
    title: '#hiring-postgres-engineer — Thread: compensation discussion',
    snippet:
      'HR (@nina): "Band is $165k–$195k base depending on level. We can flex for an exceptional candidate. ' +
      'Equity: 0.10%–0.20% 4-year vest with 1-year cliff." ' +
      'EM (@james): "Flag anyone with open-source Postgres contributions — we\'ll go to the top of band."',
    url: 'https://acme.slack.com/archives/C08XYZ/p1718000100000000',
    source: 'slack',
  },
  {
    title: '#incident-db — Postmortem: replica lag spike 2026-05-28',
    snippet:
      'Root cause: a bulk DELETE on 8M rows without a LIMIT caused WAL amplification and saturated ' +
      'replication bandwidth. Resolution: killed the transaction, re-issued in 100k-row batches, ' +
      'replica caught up in 12 minutes. Action item: add query timeout and advisory lock for bulk ops.',
    url: 'https://acme.slack.com/archives/C09INC/p1748390000000000',
    source: 'slack',
  },
];

export const greenhouseFixtures: ConnectorContextItem[] = [
  {
    title: 'Imported Role: Staff Database Engineer (Greenhouse #JOB-4412)',
    snippet:
      'Previously open role from Q1 2025 — closed after hire. ' +
      'Job brief: owned Postgres + Redis infrastructure for payments pipeline, ' +
      'required 7+ years database experience, remote-first. ' +
      'Used as baseline for current senior-level calibration.',
    source: 'greenhouse',
  },
  {
    title: 'Imported Candidate: Alex Reyes — Greenhouse Application #APP-7731',
    snippet:
      'Applied to Staff Database Engineer in Jan 2025. Stage: offer declined. ' +
      'Scorecard summary: exceptional Postgres depth, strong incident history, ' +
      'declined for a competing offer. Recruiter note: "re-engage for any senior DB role".',
    source: 'greenhouse',
  },
];

export const ashbyFixtures: ConnectorContextItem[] = [
  {
    title: 'Imported Role: Senior Backend Engineer — Data (Ashby #ROLE-221)',
    snippet:
      'Closed role from Q3 2024. Hybrid Postgres/application role. ' +
      'Used as comp and leveling reference for the current Postgres Engineer search. ' +
      'Final hire: 5 years Postgres experience, $178k base.',
    source: 'ashby',
  },
  {
    title: 'Imported Candidate: Jordan Kim — Ashby Application #CAND-5509',
    snippet:
      'Reached final round for the Q3 2024 role. Postgres depth rated "meets bar" but no replication experience. ' +
      'Recruiter note: "strong potential — may be ready for senior Postgres role by mid-2026 with growth". ' +
      'Currently at a Series C analytics company.',
    source: 'ashby',
  },
];

/** All fixtures keyed by provider name for easy lookup in the stub. */
export const AIRBYTE_FIXTURES: Record<string, ConnectorContextItem[]> = {
  notion: notionFixtures,
  github: githubFixtures,
  slack: slackFixtures,
  greenhouse: greenhouseFixtures,
  ashby: ashbyFixtures,
};
