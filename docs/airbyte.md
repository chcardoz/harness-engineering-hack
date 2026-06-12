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
- Greenhouse: candidates, applications, jobs, offers, job posts, interviews, scorecards, scheduled interviews.
  - Replication: https://docs.airbyte.com/integrations/sources/greenhouse
  - Agent connector: https://docs.airbyte.com/ai-agents/connectors/greenhouse
- Ashby: candidates, applications, jobs, postings, sources, custom fields, feedback forms.
  - Replication: https://docs.airbyte.com/integrations/sources/ashby
  - Agent connector: https://docs.airbyte.com/ai-agents/connectors/ashby

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
- creating or updating Greenhouse/Ashby records.
- posting Slack updates when the app needs to notify a team.
- syncing larger corpora into Postgres/vector search for retrieval.

For the MVP job-posting flow, Greenhouse and Ashby are better targets than LinkedIn because Airbyte has explicit ATS connector support for them.

## Suggested Split

Realtime agent actions:

- Airbyte agent connectors for Notion reads, Slack updates, GitHub reads, Greenhouse job/application operations.

Background indexing:

- Airbyte replication connectors for Notion/Slack/GitHub/ATS historical syncs.
- Destination could be Postgres/PGVector for MVP retrieval.
- ClickHouse should receive traces/events, not raw connector state unless analytics need it.

## Risks And Caveats

- Marketplace connectors may be community-maintained and may not have production SLAs.
- OAuth/connector setup must be tenant-scoped per organization.
- Agents should not receive broad connector powers. Use least-privilege scopes and explicit confirmations.
- LinkedIn recruiting/job-board posting is not covered by the Airbyte connector set found.

## MVP Recommendation

Use Airbyte Agents for live tool access and Greenhouse or Ashby as the first ATS/job-board-like integration. Defer full replication until the first demo needs historical search across large Notion/Slack/GitHub content.
