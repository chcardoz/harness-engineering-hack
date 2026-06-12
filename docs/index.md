# Yougrep Research Docs

This folder contains stack research for the recruiter-agent MVP. No application code has been written.

## Docs

- [Airbyte](./airbyte.md): connector and third-party data access layer.
- [Better Auth](./better-auth.md): authentication and organization model.
- [ClickHouse](./clickhouse.md): optional analytics, observability, and trace store.
- [Guild AI](./guild-ai.md): agent control plane for the job-channel and interview agents.
- [Implementation Blueprint](./implementation-blueprint.md): language, repo shape, database shape, agent wiring, and compartmentalization.
- [OpenUI](./openui.md): generative UI renderer for chat/interview surfaces.
- [Product Stack Overview](./product-stack-overview.md): how the product feels and how the stack fits together.
- [Render](./render.md): app hosting and managed Postgres.
- [TrueFoundry](./truefoundry.md): LLM gateway and model routing for non-realtime text/model calls.
- [Voice Model Providers](./voice-model-providers.md): top voice-agent/model providers for live interviews.
- [MVP Architecture](./mvp-architecture.md): recommended first build path and stack roles.

## Current Recommendation

For the simplest end-to-end MVP, start with:

- Render
- Postgres
- Better Auth
- OpenUI
- Airbyte
- Guild for agent control
- TrueFoundry for LLM gateway/model routing
- GPT Realtime 2 for voice interviews

Defer:

- ClickHouse until traces/analytics matter.
- Voice until the text interview flow works end to end, then add GPT Realtime 2 over WebRTC.
