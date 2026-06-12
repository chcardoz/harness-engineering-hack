# Guild AI

## Naming Clarification

There are two different things commonly called Guild AI:

- `guild.ai`: a newer AI agent control plane for building, deploying, governing, tracing, and sharing agents.
- `guildai/guildai`: an older open-source ML experiment tracking toolkit.

Because the requested stack describes Guild AI as a control plane like Airbyte, this doc focuses on `guild.ai`, the agent control plane. The older ML experiment tracker is not the right fit for this product architecture.

Sources:

- Agent control plane: https://www.guild.ai/
- Developers page: https://www.guild.ai/solutions/developers
- Custom integrations: https://docs.guild.ai/services/create-an-integration
- Older ML experiment tracker: https://github.com/guildai/guildai

## What It Is

Guild is the control plane for Yougrep's agents. It focuses on agent lifecycle, deployment, credentials, scoped access, tracing, sharing, and governance.

## Relevant Capabilities

- TypeScript SDK and CLI.
- Agent versioning, publishing, rollback, and Agent Hub.
- Scoped credentials and per-endpoint access.
- Session tracing with inputs, outputs, tool calls, usage, and latency.
- Model-agnostic operation.
- Integrations for tools such as Slack, GitHub, Jira, Linear, Notion, Confluence, and custom REST APIs.
- Custom integrations that proxy HTTP requests through Guild runtime with auth, rate limiting, and credential injection.

## Fit For Yougrep MVP

Use Guild for governed production execution from day one:

- per-job/channel agent identity and versioning.
- interview agent identity and versioning.
- scoped connector permissions.
- audit trail for every agent action.
- approval gates for mutations, such as publishing a job posting to the org's own Yougrep job board after confirmation.
- versioned agent behavior.
- shared internal agent templates.

It overlaps less with Airbyte and TrueFoundry than it first appears:

- Airbyte is better for connector/data access.
- Guild is better for agent lifecycle and governance.
- TrueFoundry is better for model gateway/provider routing.

In the Slack-like UI, Guild is not the visual chat product. The UI is built by Yougrep and rendered with OpenUI. Guild runs/governs the agent behind the channel.

## Possible Architecture Role

If used:

1. Yougrep backend owns product state and user sessions.
2. Better Auth identifies recruiter organization/user.
3. Guild runs/governs the job-channel agent and interview agent definitions.
4. Airbyte provides connectors/tools.
5. TrueFoundry routes model calls.
6. Postgres stores product state.
7. ClickHouse stores traces/events.

## Risks And Caveats

- Guild adds platform complexity, but it is the intended agent-control layer for this stack.
- Docs/product appear newer than Airbyte/Render/Better Auth, so expect some product surface changes.
- If some runtime logic is hosted in Yougrep on Render, keep Guild's boundary clear: versions, permissions, traces, and controlled tool execution.
- Confirm pricing, API maturity, and whether required connectors are available in the actual account.

## MVP Recommendation

Use Guild for agent/tool governance and agent versions. Do not use it for app hosting, auth, UI rendering, or connector replication.
