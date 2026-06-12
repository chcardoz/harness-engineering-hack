# Airbyte

## What It Is

Airbyte is the best fit in this stack for connectors and third-party data access. It has two relevant surfaces:

- Airbyte data replication connectors for syncing data from SaaS tools/databases into destinations.
- Airbyte Agents / agent connectors for realtime tool-style API access from AI agents.

Official sources:

- Airbyte docs: https://docs.airbyte.com/
- Agent connectors: https://docs.airbyte.com/ai-agents/connectors
- Connector Builder: https://docs.airbyte.com/platform/connector-development/connector-builder-ui/overview
- Connector support levels: https://docs.airbyte.com/integrations/connector-support-levels

## Relevant Capabilities

- Managed connector authentication and credential storage.
- Type-safe Python SDK-style agent connectors.
- API/CLI/Python/MCP interfaces for agent execution.
- Embedded widget pattern for customer connector setup.
- Connector Builder for missing REST API source connectors.
- Replication destinations including databases and vector stores.

Agent connectors differ from replication connectors. Agent connectors are for realtime API calls by agents; replication connectors are for moving larger datasets into an owned store for search, analytics, or memory.

## Connector Fit

Strong ready fits:

- Notion: pages, blocks, comments, users, and related workspace content.
  - Replication: https://docs.airbyte.com/integrations/sources/notion
  - Agent connector: https://docs.airbyte.com/ai-agents/connectors/notion
- Slack: messages, threads, users, channels, and agent actions like sending/updating messages.
  - Replication: https://docs.airbyte.com/integrations/sources/slack
  - Agent connector: https://docs.airbyte.com/ai-agents/connectors/slack
- GitHub: repositories, issues, PRs, commits, comments, and codebase/project context.
  - Replication: https://docs.airbyte.com/integrations/sources/github
  - Agent connector: https://docs.airbyte.com/ai-agents/connectors/github
- Greenhouse (READ-ONLY): candidates, applications, jobs, offers, job posts, interviews, scorecards, scheduled interviews are readable streams. The Greenhouse agent and replication connectors are read-only — they cannot create/publish job postings, update application status, schedule interviews, or send offers.
  - Replication: https://docs.airbyte.com/integrations/sources/greenhouse
  - Agent connector: https://docs.airbyte.com/ai-agents/connectors/greenhouse
- Ashby (READ-ONLY): candidates, applications, jobs, postings, sources, custom fields, feedback forms are readable streams. The Ashby agent and replication connectors are read-only — no write/publish operations.
  - Replication: https://docs.airbyte.com/integrations/sources/ashby
  - Agent connector: https://docs.airbyte.com/ai-agents/connectors/ashby

Unlike the Notion, Slack, and GitHub agent connectors (which do support writes — create pages/messages/issues), the Greenhouse and Ashby connectors expose reads only.

Potential ATS connectors mostly through replication/marketplace:

- Lever: https://docs.airbyte.com/integrations/sources/lever-hiring
- Workable: https://docs.airbyte.com/integrations/sources/workable
- Breezy HR: https://docs.airbyte.com/integrations/sources/breezy-hr
- Recruitee: https://docs.airbyte.com/integrations/sources/recruitee

LinkedIn caveat:

- Official Airbyte support appears to cover LinkedIn Ads and LinkedIn Pages, not LinkedIn Recruiter, LinkedIn Jobs posting, or candidate search.
- LinkedIn Ads agent connector: https://docs.airbyte.com/ai-agents/connectors/linkedin-ads
- LinkedIn Ads source: https://docs.airbyte.com/integrations/sources/linkedin-ads
- LinkedIn Pages source: https://docs.airbyte.com/integrations/sources/linkedin-pages

## Fit For Yougrep MVP

Use Airbyte for:

- connecting a company's Notion, Slack, GitHub, and ATS.
- reading context for a job/channel.
- reading/importing a customer's existing Greenhouse/Ashby jobs/candidates as context only — never writing back (these connectors are read-only).
- posting Slack updates when the app needs to notify a team (Slack agent writes are real and supported).
- syncing larger corpora into Postgres/vector search for retrieval.

For the MVP job-posting flow, Yougrep posts to its OWN public job board, not to an external ATS. Each org gets a public board at `/c/{org-slug}` listing its roles, each role page has a "Start interview" CTA, and Postgres is the system of record. Greenhouse and Ashby are read-only import sources for context, not posting targets — Airbyte cannot publish or update postings in either.

## Suggested Split

Realtime agent actions:

- Airbyte agent connectors for Notion reads, Slack updates, GitHub reads, and read-only Greenhouse/Ashby imports.

Background indexing:

- Airbyte replication connectors for Notion/Slack/GitHub/ATS historical syncs.
- Destination could be Postgres/PGVector for MVP retrieval.
- ClickHouse should receive traces/events, not raw connector state unless analytics need it.

## Risks And Caveats

- Marketplace connectors may be community-maintained and may not have production SLAs.
- OAuth/connector setup must be tenant-scoped per organization.
- Agents should not receive broad connector powers. Use least-privilege scopes and explicit confirmations.
- LinkedIn recruiting/job-board posting is not covered by the Airbyte connector set found.
- The Greenhouse and Ashby connectors (both agent and replication) are read-only. They cannot create/publish job postings, update application status, schedule interviews, or send offers. Treat them as import/context sources only.
- ATS write-back into a customer's Greenhouse/Ashby is deferred until a real customer requires it. If/when needed it would use native ATS write APIs (Greenhouse Harvest API) or a unified API like Kombo — not Airbyte. Note Ashby has no public API to publish a job posting to its board (UI-only), and Greenhouse Harvest can flip an existing job post live but needs the post object to already exist.

## MVP Recommendation

Use Airbyte Agents for live tool access. Yougrep's own public job board (`/c/{org-slug}`, Postgres as system of record) is the posting surface — not an external ATS. Airbyte provides read-only context: Notion/GitHub reads, Slack reads plus optional notifications, and optional read-only import of a customer's existing Greenhouse/Ashby jobs/candidates. Defer full replication until the first demo needs historical search across large Notion/Slack/GitHub content.
