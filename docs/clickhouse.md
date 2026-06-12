# ClickHouse

## What It Is

ClickHouse is a high-performance column-oriented SQL database for analytics/OLAP workloads. It is not PostgreSQL and should not be treated as the primary transactional app database.

Official docs: https://clickhouse.com/docs/intro

## Relevant Capabilities

- Very fast scans, aggregations, and time-series/event analytics.
- Strong fit for logs, traces, metrics, and high-volume append-style event tables.
- PostgreSQL integration options, including querying remote Postgres tables and CDC-style replication paths.
- PostgreSQL wire-protocol compatibility in self-managed ClickHouse, but the docs note that this interface is not supported in ClickHouse Cloud.

Sources:

- PostgreSQL integration overview: https://clickhouse.com/docs/integrations/postgresql
- PostgreSQL wire protocol: https://clickhouse.com/docs/interfaces/postgresql
- PostgreSQL database engine: https://clickhouse.com/docs/engines/database-engines/postgresql
- PostgreSQL table function and PeerDB note: https://clickhouse.com/docs/sql-reference/table-functions/postgresql
- Observability with ClickHouse: https://clickhouse.com/docs/use-cases/observability/introduction

## Fit For Yougrep MVP

ClickHouse is useful for analytics and traces, not core app state.

Good ClickHouse tables:

- `agent_events`: agent turns, tool calls, model calls, function outcomes.
- `interview_events`: question asked, answer received, rubric score, UI component rendered, latency.
- `llm_traces`: prompt hash, model, provider, token usage, cost, error, duration.
- `connector_events`: Notion/GitHub/Slack/Greenhouse sync events, failures, rate limits.
- `funnel_events`: job viewed, one-click apply started, interview completed, recruiter reviewed.
- `candidate_signal_events`: extracted skills, score changes, evidence references.

Keep these in Postgres:

- users, organizations, memberships, and auth/session metadata.
- job channels, chat messages, candidate records, applications, interview sessions.
- workflow state that requires transactional updates and referential integrity.

## Postgres Pairing

Recommended architecture:

1. Postgres is the source of truth.
2. The app/worker writes immutable analytics events directly to ClickHouse.
3. If reporting needs relational dimensions from Postgres, replicate selected Postgres tables into ClickHouse using a CDC pipeline such as ClickPipes or PeerDB.

ClickHouse can integrate with PostgreSQL through table engines/functions and CDC tooling, but those are integration surfaces. They do not make ClickHouse a drop-in Postgres replacement for Better Auth, application transactions, or job workflow state.

## Risks And Caveats

- ClickHouse is optimized for analytical reads and append-heavy writes, not OLTP-style row updates across many transactional tables.
- PostgreSQL wire compatibility is limited and does not mean all Postgres features work.
- CDC pipelines can introduce eventual consistency. Analytics queries may need deduplication/version-aware logic.
- If the MVP timeline is short, Postgres plus structured logs may be enough initially; add ClickHouse when trace/event volume or dashboard latency justifies it.

## MVP Recommendation

Start with Postgres as the only required database. Add ClickHouse for agent/interview observability if the hackathon scope includes self-improvement, ranking dashboards, trace analytics, or cost/latency reporting.
