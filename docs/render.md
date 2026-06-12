# Render

## What It Is

Render is the deployment target for the MVP. It can host the dashboard, API, realtime chat/interview backend, background workers, cron jobs, managed Postgres, and Redis-compatible key-value storage.

Official docs: https://render.com/docs/service-types

## Relevant Capabilities

- Static Sites for a built frontend SPA/dashboard served from a CDN.
- Web Services for public HTTP APIs, server-rendered apps, and WebSocket endpoints.
- Background Workers for continuously running internal processes such as queue consumers.
- Cron Jobs for scheduled syncs, cleanup, and digest generation.
- Render Postgres for the transactional app database.
- Render Key Value for Redis-compatible queues/cache/session-adjacent data.
- Environment variables, secret files, and environment groups for service config.
- Blueprints through `render.yaml` for infrastructure-as-code.

Sources:

- Service types: https://render.com/docs/service-types
- Web services: https://render.com/docs/web-services
- WebSockets: https://render.com/docs/websocket
- Environment variables and secrets: https://render.com/docs/configure-environment-variables
- Blueprint spec: https://render.com/docs/blueprint-spec
- Cron jobs: https://render.com/docs/cronjobs

## Fit For Yougrep MVP

Use Render as the primary runtime:

- `web`: recruiter dashboard plus candidate apply/interview pages if server-rendered, or API if frontend is deployed separately.
- `static site`: dashboard frontend if using a purely built SPA.
- `api/websocket service`: Slack-like channel chat, live agent updates, and browser-based interview sessions.
- `worker`: long-running agent jobs such as reading Notion/GitHub/Slack context, generating job listings, ranking candidates, summarizing interviews, and posting to Greenhouse.
- `cron`: scheduled connector refresh, stale application cleanup, daily channel summaries, and trace export/aggregation jobs.
- `postgres`: users, organizations, jobs/channels, messages, candidates, applications, interview sessions, auth metadata, and workflow state.
- `redis/key-value`: job queues, short-lived coordination, rate-limit state, and WebSocket fanout if needed.

Render Web Services can accept inbound WebSocket connections from the public internet. Public HTTP and WebSocket traffic routes to one public service port, so keep the realtime API on the same web service unless there is a clear scaling reason to split it.

## Deployment Notes

- Services should bind to `0.0.0.0` and use Render's provided `PORT`.
- Add an HTTP health check path for the backend.
- Use environment groups for shared values like `DATABASE_URL`, `BETTER_AUTH_SECRET`, gateway keys, Airbyte/Guild credentials, and model provider config.
- Use Blueprint placeholder secrets rather than committing secret values.
- Use `preDeployCommand` for database migrations before a new backend version starts serving.
- Put services and databases in the same Render region where possible.

## Risks And Caveats

- Free web services are not appropriate for a production-ish realtime interviewer because idle spin-down and instance replacement will hurt WebSocket sessions.
- WebSocket clients need reconnect and resume logic because deploys, maintenance, and instance replacement can interrupt connections.
- Background workers have no public URL. They should consume queue jobs and call internal/public services as needed.
- Render is the app host, not the agent governance layer; it will not replace Guild/TrueFoundry/Airbyte.

## MVP Recommendation

Use Render for hosting and managed Postgres. Start with one web service for API + WebSockets, one worker service, one cron job service, and one Postgres database. Add a static site only if the frontend build is cleanly separate from the backend.

## Deployment Blurb For Yougrep

Use a `render.yaml` Blueprint to deploy the whole app as connected Render resources: a Next.js `web` service, a background `worker`, scheduled `cron` jobs, and Render Postgres. Store platform credentials in Render environment variables or environment groups. The `web` service binds to Render's `PORT` and handles recruiter UI, candidate UI, API routes, auth routes, and realtime session bootstrap. The worker drains long-running jobs such as ATS posting, connector refreshes, transcript finalization, and candidate summaries. Services should connect to Postgres through the internal database URL when they are in the same Render account and region.

External platform calls are all server-side: Guild for agent control, TrueFoundry for text LLM gateway calls, Airbyte for connectors, and OpenAI for GPT Realtime 2 session creation. In Airbyte hosted mode, Airbyte stores and refreshes third-party connector credentials for Slack, Notion, GitHub, Greenhouse, and Ashby; Render only needs Yougrep-owned credentials such as Airbyte access, Guild, TrueFoundry, OpenAI, Better Auth, and database URLs. The candidate browser receives only an ephemeral Realtime credential for WebRTC; it never receives long-lived platform keys.
