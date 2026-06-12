# Implementation Blueprint

## Language And Framework

Use TypeScript for the core product.

Recommended app stack:

- Next.js for the recruiter dashboard, candidate interview web app, and backend route handlers.
- React for the UI.
- OpenUI React renderer for generated UI inside chat/interview messages.
- Better Auth for auth and organizations.
- Drizzle ORM or Prisma for Postgres schema/migrations. Drizzle is the leaner fit if the team wants SQL-shaped control; Prisma is fine if faster onboarding matters more.
- Node.js workers for async jobs.
- Guild TypeScript SDK/control plane for agent definitions and governance.
- TrueFoundry's OpenAI-compatible gateway for non-realtime text/model calls.
- OpenAI Realtime API with GPT Realtime 2 for browser voice interviews.

Why TypeScript:

- Better Auth is TypeScript-native.
- OpenUI/React integration is TypeScript/React-shaped.
- Guild's public examples and SDK positioning are TypeScript-oriented.
- The frontend/backend/shared types can live in one monorepo.

Use Python only if a specific Airbyte agent connector path requires it. If so, isolate it as a small connector-worker service rather than making the whole product Python.

## Repo Shape

Recommended monorepo:

```text
yougrep/
  apps/
    web/
      app/
        (auth)/
        (recruiter)/
        interview/
        api/
      components/
      lib/
      styles/
    worker/
      src/
        jobs/
        queues/
        processors/
    connector-worker/
      src/
        airbyte/
        notion/
        greenhouse/   # read/import only
        ashby/        # read/import only
  packages/
    agents/
      src/
        job-channel-agent.ts
        interview-agent.ts
        shared/
          prompts.ts
          tools.ts
          rubrics.ts
          policies.ts
    db/
      src/
        schema.ts
        queries/
        migrations/
    auth/
      src/
        auth.ts
        permissions.ts
    openui/
      src/
        recruiter-library.tsx
        interview-library.tsx
        renderers.tsx
    domain/
      src/
        jobs.ts
        candidates.ts
        interviews.ts
        messages.ts
        connectors.ts
    integrations/
      src/
        guild.ts
        truefoundry.ts
        openai-realtime.ts
        airbyte.ts
        greenhouse.ts # read/import only
    config/
      src/
        env.ts
        constants.ts
  docs/
  render.yaml
  package.json
  pnpm-workspace.yaml
```

## Runtime Services

### Web App

Runs on Render as a web service.

Responsibilities:

- recruiter Slack-like UI.
- candidate interview UI.
- Better Auth routes.
- API routes for messages, jobs, applications, interview sessions.
- WebRTC session bootstrap for GPT Realtime 2.
- OpenUI rendering in React.

### Worker

Runs on Render as a background worker.

Responsibilities:

- long-running connector syncs (read-only).
- publish/refresh the org's own job board postings.
- transcript summarization.
- candidate scoring/rubric extraction.
- digest generation.
- retryable tool workflows.

### Connector Worker

Optional separate service if Airbyte/Python connector usage is easier outside the TypeScript app.

Responsibilities:

- call Airbyte agent connectors.
- normalize connector responses.
- return typed results to the main backend.

If Airbyte can be called cleanly from TypeScript/API, skip this service for MVP.

## Render Deployment Blurb

Deploy Yougrep to Render as a small multi-service app defined by `render.yaml`. Render Blueprints are the infrastructure-as-code layer for declaring interconnected services, databases, and environment groups. The first deployment should include:

- `web`: Next.js web service for recruiter UI, candidate interview UI, API routes, auth routes, and realtime/session bootstrap.
- `worker`: background worker for long-running jobs such as publishing/refreshing the org's own job board, transcript finalization, summaries, and connector refreshes.
- `cron`: scheduled cleanup/sync/digest jobs.
- `postgres`: Render Postgres as the transactional source of truth.
- optional `connector-worker`: only if Airbyte/Python connector execution needs its own service.

All Render services share environment groups for non-secret config and receive secrets through Render environment variables, not committed files. The database connection should use Render Postgres's internal URL when services and database are in the same account and region. Public HTTP/WebSocket traffic for the web service uses Render's single public port, so the web app should bind to `PORT`; browser voice uses WebRTC directly to GPT Realtime 2 after the backend creates an ephemeral session credential.

Official Render docs:

- Blueprints: https://render.com/docs/blueprint-spec
- Environment variables and secrets: https://render.com/docs/configure-environment-variables
- WebSockets: https://render.com/docs/websocket
- Render Postgres connections: https://render.com/docs/postgresql-creating-connecting

## Platform Connections

Connections to external platforms are configured through server-side environment variables plus Airbyte-hosted connector records. All external connectors are read-only: Yougrep hosts its own job board and does not write to external ATSs, so no per-tenant ATS write credentials are stored. In the recommended Airbyte hosted mode, Yougrep does not store Slack, Notion, Greenhouse, or Ashby OAuth secrets directly. Airbyte stores those read connector credentials securely and handles token refresh; Yougrep stores Airbyte credentials and connector IDs/references.

```text
BETTER_AUTH_SECRET
DATABASE_URL
GUILD_API_KEY
GUILD_WORKSPACE_ID
TRUEFOUNDRY_GATEWAY_BASE_URL
TRUEFOUNDRY_API_KEY
OPENAI_API_KEY
AIRBYTE_API_KEY
AIRBYTE_WORKSPACE_ID
AIRBYTE_ORGANIZATION_ID
AIRBYTE_CONNECTOR_IDS_JSON
CLICKHOUSE_URL / CLICKHOUSE_USER / CLICKHOUSE_PASSWORD
```

Connection ownership:

- Better Auth owns user/org sessions and writes auth/org data to Postgres.
- Guild owns agent definitions, agent versions, tool scopes, and agent traces.
- TrueFoundry owns model-provider gateway credentials for non-realtime LLM calls.
- OpenAI owns GPT Realtime 2 voice sessions; the backend creates ephemeral credentials for browser WebRTC.
- Airbyte owns read-only connector execution and hosted connector credentials for Notion, Slack, GitHub, and optional Greenhouse/Ashby imports. Yougrep never writes to external ATSs.
- Yougrep owns its public job board: orgs, job listings, board postings, candidates, applications, and interviews live in Postgres.
- Postgres stores connector account metadata, organization scope, Airbyte connector IDs, connection status, and product records.
- ClickHouse, if enabled, receives append-only analytics/traces from workers or backend instrumentation.

The browser only talks to the Yougrep backend and, for the voice interview, to the GPT Realtime 2 WebRTC session using an ephemeral credential minted by the backend. It never receives long-lived Guild, TrueFoundry, Airbyte, ATS, or database credentials.

Exceptions:

- If using self-managed Airbyte, Marketplace/custom connectors, or OAuth override credentials, Yougrep may need to provide third-party OAuth app client IDs/secrets to Airbyte setup. Even then, those secrets should be server-side Render env vars or manually configured in Airbyte, not exposed to the browser.
- If Yougrep builds its own native Slack app outside Airbyte for notifications or interactive Slack surfaces, then Slack app credentials become Yougrep-owned. That is not the default connector architecture.

## Owned Job Board

Yougrep hosts its own public job board rather than posting jobs to external ATSs. Airbyte agent connectors for Greenhouse/Ashby are read-only (they cannot create/publish job posts, update application status, schedule interviews, or send offers), and native ATS write APIs would require per-tenant long-lived credential storage, partner considerations, and (for Ashby) there is no public job-post publish endpoint. Owning the board removes the only hard blocker and unifies the public job page with the candidate interview entry point.

- Each org gets a public, unauthenticated job board at a clean slug `/c/{org-slug}` listing its open roles; each role at `/c/{org-slug}/{job-slug}` with a "Start interview" CTA.
- Viewing is public and crawlable (clean slugs). Starting an interview is lightly gated (candidate email/magic-link); the backend then creates the `interview_session` and mints the ephemeral GPT Realtime 2 credential.
- Postgres is the system of record for orgs, job listings, board postings, candidates, applications, and interviews.

Deferred (future, not current capability):

- Distribution: a self-hosted board has no inbound candidate traffic on its own; cross-posting/syndication is later.
- ATS write-back (native Greenhouse Harvest API, or a unified API like Kombo) is deferred until a real customer requires it.

## Postgres Shape

Core tenant/auth tables are owned by Better Auth plus the app.

Recommended product tables:

```text
organizations
users
memberships

connector_accounts
connector_events

job_channels
job_channel_members
channel_messages
agent_runs
tool_calls
openui_artifacts

job_listings
job_board_postings

candidates
applications

interview_sessions
interview_turns
interview_artifacts
interview_scores
interview_transcripts

candidate_summaries
candidate_rankings

audit_events
```

`job_board_postings` holds internal postings on Yougrep's own public job board (tenant-scoped via `organization_id`), with a posting `status` (`draft`/`published`), a public `slug`, and `published_at`.

### Key Relationships

```text
organizations 1 -> many job_channels
organizations 1 -> many connector_accounts
job_channels 1 -> many channel_messages
job_channels 1 -> many job_listings
job_channels 1 -> many applications
candidates 1 -> many applications
applications 1 -> many interview_sessions
interview_sessions 1 -> many interview_turns
interview_sessions 1 -> many interview_scores
channel_messages 1 -> many openui_artifacts
agent_runs 1 -> many tool_calls
```

### Important Columns

Most product tables should include:

```text
id
organization_id
created_at
updated_at
created_by_user_id
```

Agent/tool/audit tables should include:

```text
agent_run_id
guild_run_id
model_provider
model_name
trace_id
tool_name
status
latency_ms
error_message
metadata_json
```

Interview tables should include:

```text
candidate_id
application_id
job_channel_id
session_status
started_at
ended_at
transcript_json
rubric_json
consent_recorded_at
recording_url
openui_artifact_ids
```

## Agent Separation

Use two main agent types.

### Job-Channel Agent

Lives behind the recruiter chat.

Responsibilities:

- understand the job channel history.
- read company context through Airbyte (read-only).
- draft and revise job listings.
- publish a posting to the org's own Yougrep job board after confirmation.
- summarize candidates.
- compare applicants with transcript evidence.
- render recruiter-facing OpenUI components.

Inputs:

- job channel messages.
- job listing state.
- connector context.
- candidate/interview summaries.
- recruiter command.

Outputs:

- chat response.
- OpenUI artifact.
- tool call requests.
- structured state updates.

### Interview Agent

Lives behind candidate interview sessions.

Responsibilities:

- run the interview plan for one application.
- ask role-specific questions.
- present OpenUI exercises.
- use GPT Realtime 2 for voice.
- produce transcript, rubric, and evidence.
- end the interview cleanly.

Inputs:

- distilled job brief.
- interview rubric.
- allowed question plan.
- candidate/application metadata.
- prior turns in this interview only.

Outputs:

- realtime voice responses.
- OpenUI interview artifacts.
- transcript turns.
- rubric observations.
- final interview package.

## Communication Between Agents

Do not let agents directly message each other.

Use persisted handoff objects in Postgres:

```text
job_context_snapshots
interview_plans
interview_result_packages
candidate_summaries
```

Flow:

1. Job-channel agent creates a distilled `interview_plan` for the role.
2. Interview session reads that plan at start.
3. Interview agent runs only with the plan, rubric, and candidate session context.
4. Interview agent writes an `interview_result_package`.
5. Job-channel agent reads the result package later when the recruiter asks about candidates.

This keeps the candidate interview isolated from raw company chat history and private connector content.

## Compartmentalization

### Tenant Boundary

Every product query is scoped by `organization_id`. The backend checks membership before returning anything.

### Agent Boundary

Job-channel agents can see company context for one organization and one job channel.

Interview agents cannot see the raw recruiter thread or full connector data. They receive only:

- public job listing.
- distilled role brief.
- interview rubric.
- allowed questions/tasks.
- candidate's own interview history.

### Tool Boundary

Tools are declared by purpose and scoped:

- read-only Notion context.
- read-only GitHub context.
- publish a job posting to the org's own Yougrep job board only after recruiter confirmation.
- no candidate rejection/send-outreach mutation without human confirmation.

Guild should enforce tool scope at the agent level. The backend should enforce organization and workflow checks as a second layer.

### Model Boundary

Company text/chat model calls:

```text
Yougrep backend -> Guild agent -> TrueFoundry gateway -> model provider
```

Candidate realtime voice:

```text
Candidate browser -> GPT Realtime 2 WebRTC session
Backend -> ephemeral realtime session credential
Backend/tools -> persisted transcript, rubric, events
```

### UI Boundary

OpenUI only renders predefined components from the app's component libraries. It does not execute arbitrary model-generated code.

### Data Boundary

Postgres is source of truth. ClickHouse is only for append-heavy analytics/traces if added later.

## End-To-End Wiring

### Recruiter Chat

```text
React chat input
  -> Next.js API route
  -> Better Auth session check
  -> Postgres load channel context
  -> Guild job-channel agent
  -> TrueFoundry LLM call
  -> Airbyte read-only context tool calls if needed
  -> Postgres persist message/tool output/OpenUI artifact
  -> React renders chat + OpenUI component
```

### Candidate Voice Interview

```text
Candidate opens role on the org's job board (/c/{org-slug}/{job-slug}) and starts interview (email/magic-link gate)
  -> Next.js creates interview_session
  -> backend loads interview_plan
  -> backend creates GPT Realtime 2 ephemeral session
  -> browser connects over WebRTC
  -> realtime agent asks questions and emits transcript/events
  -> backend stores turns/artifacts/scores
  -> worker finalizes interview_result_package
  -> recruiter sidebar updates
```

### Recruiter Review

```text
Recruiter asks "who is best?"
  -> Guild job-channel agent
  -> reads candidate summaries/interview packages from Postgres
  -> calls TrueFoundry for synthesis
  -> returns evidence-backed answer + OpenUI comparison table
```

## MVP Implementation Order

1. Repo scaffold and database schema.
2. Better Auth organization login.
3. Recruiter workspace shell.
4. Job channels and channel messages.
5. Guild job-channel agent with TrueFoundry model calls.
6. OpenUI recruiter components.
7. Airbyte Notion/GitHub/Slack reads (read-only; optional Greenhouse/Ashby import as context).
8. Owned public job board: publish/refresh postings and the public `/c/{org-slug}` and `/c/{org-slug}/{job-slug}` pages.
9. Candidate apply/start-interview flow (email/magic-link gate) and text interview.
10. Interview result package and recruiter review sidebar.
11. GPT Realtime 2 voice interview.
12. ClickHouse traces if needed.
