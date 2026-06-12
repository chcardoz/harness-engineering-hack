# Yougrep Product And Stack Overview

## What Yougrep Is

Yougrep is a recruiter-agent workspace for companies hiring technical talent. It feels like a focused Slack workspace where every channel is one job opening, and every job channel has its own long-running agent that understands the role, the company context, connector data, candidates, and interview history.

The product has two main surfaces:

- Company/recruiter workspace: a Slack-like dashboard for creating job channels, connecting company tools, generating job listings, reviewing candidates, and asking the agent questions.
- Candidate interview surface: a one-click apply flow that opens a live GPT Realtime 2 interview with generated UI exercises from OpenUI.

## What It Feels Like

### Company User

The company user logs into Yougrep and lands in a quiet, dense, Slack-like workspace:

- left sidebar with job channels.
- connector section for Notion, Slack, GitHub, Greenhouse/Ashby.
- main center thread for the selected job.
- right sidebar for applicants, interview status, candidate summaries, and next actions.

The user creates a channel like `postgres-engineer`. Inside the channel, they talk to the agent:

- "Read the Notion doc about what we want."
- "Look at our GitHub repos and infer what database work this person will do."
- "Draft the listing."
- "Post it to Greenhouse."

The agent responds conversationally, but important outputs are rendered as OpenUI components:

- job listing draft cards.
- requirement checklists.
- connector status panels.
- candidate comparison tables.
- posting confirmation controls.
- interview summary cards.

The company side should feel like an operations tool, not a marketing website: fast, scannable, restrained, and built for repeated hiring workflows.

### Candidate

The candidate sees a job listing on the ATS/job board. Instead of a long resume upload flow, there is a "skip the line" or "one-click interview" entry point.

When they start, they enter a focused browser interview:

- a live GPT Realtime 2 voice interviewer speaks naturally.
- the candidate can interrupt, clarify, or ask questions.
- transcripts are captured in real time.
- OpenUI renders exercises and structured prompts beside the voice conversation.

For a Postgres engineer role, the UI might show:

- a short SQL debugging task.
- a schema-design prompt.
- a replication/backup incident scenario.
- sliders or structured controls for self-rating familiarity.
- a final review screen.

The candidate experience should feel direct and respectful: no gimmicks, no fake human pretending, clear consent, clear recording/transcript notice, and an obvious end state.

### Recruiter/Hiring Manager

Back in the job channel, the right sidebar fills with candidates who completed interviews. The recruiter can ask:

- "Who looks strongest?"
- "What did Priya solve?"
- "Did anyone actually know logical replication?"
- "Compare the top three on debugging depth."
- "Show evidence from the interview transcript."

The agent answers with evidence-backed summaries and links back to transcript moments, rubric scores, and generated UI exercise results. It should never present the model's score as the final hiring decision; it should assist human review.

## Stack Roles

### Render

Render hosts the product:

- web app/dashboard.
- API and WebSocket service.
- background worker for agent jobs and connector jobs.
- cron jobs for scheduled sync/cleanup.
- managed Postgres.

Render is the deployment layer, not the AI layer.

Docs: https://render.com/docs/service-types

### Postgres

Postgres is the source of truth:

- users and organizations.
- memberships and roles.
- job channels.
- channel messages.
- connector accounts.
- job listings.
- candidates and applications.
- interview sessions and turns.
- rubric scores.
- audit events.

This is the transactional database. Auth, workflow state, candidate records, and recruiter-visible data should live here.

### Better Auth

Better Auth handles login and organization membership.

It should be used with the Organization plugin so every company has a tenant boundary from day one. Every job, connector account, candidate, interview, and message must be scoped to an organization.

Docs: https://www.better-auth.com/docs/plugins/organization

### Airbyte

Airbyte is the connector layer.

Use Airbyte agent connectors for realtime tool access:

- read Notion role docs.
- inspect Slack/GitHub context if connected.
- post or update Greenhouse/Ashby records.
- retrieve ATS candidate/job/application data.

Use replication connectors later only when the app needs larger historical search or analytics syncs.

Docs: https://docs.airbyte.com/ai-agents/connectors

### OpenUI

OpenUI renders generated UI inside chat and interview messages.

It should not generate arbitrary code. The app defines a constrained component library, and the agent emits OpenUI Lang that maps to those safe components.

Company-side examples:

- `JobListingDraft`
- `ConnectorStatus`
- `CandidateCard`
- `CandidateComparisonTable`
- `InterviewSummary`
- `PostToATSConfirmation`

Candidate-side examples:

- `QuestionCard`
- `SQLProblemEditor`
- `ArchitecturePrompt`
- `RubricProgress`
- `InterviewComplete`

Docs: https://www.openui.com/docs/openui-lang

### GPT Realtime 2

GPT Realtime 2 is the selected live voice model for the candidate interview.

It handles:

- low-latency speech-to-speech.
- natural turn-taking and barge-in.
- realtime tool use.
- voice interview flow.
- transcript/audio event stream.
- handoff to backend tools and guardrails.

The browser should connect using WebRTC. The backend creates ephemeral client credentials and owns business logic, tool permissions, candidate/session identity, and persistence.

Docs:

- Realtime overview: https://developers.openai.com/api/docs/guides/realtime
- Voice agents: https://developers.openai.com/api/docs/guides/voice-agents
- WebRTC: https://developers.openai.com/api/docs/guides/realtime-webrtc

### TrueFoundry

TrueFoundry is the LLM gateway for non-voice model calls.

It handles:

- model-provider routing.
- centralized API keys.
- governance and monitoring.
- prompt/model observability.
- routing cheaper models for summaries and stronger models for final synthesis.

In the Slack-like company chat, the Guild-managed job-channel agent should call models through TrueFoundry's OpenAI-compatible gateway. The browser never calls TrueFoundry directly; all calls go through the Yougrep backend/Guild runtime so tenant checks, tool scopes, and traces stay controlled.

For the voice interview itself, GPT Realtime 2 should be called through the OpenAI Realtime path unless TrueFoundry explicitly supports that realtime mode in the target environment.

Docs: https://www.truefoundry.com/docs/ai-gateway/intro-to-llm-gateway

### ClickHouse

ClickHouse is optional analytics and observability storage.

Use it for append-heavy events:

- agent traces.
- LLM latency/cost events.
- tool call events.
- interview events.
- funnel analytics.

Do not use it as the main app database.

Docs: https://clickhouse.com/docs/use-cases/observability/introduction

### Guild AI

Guild is the agent control plane for the product.

It handles:

- job-channel agent definitions.
- interview agent definitions and versions.
- agent versioning.
- scoped tool permissions.
- deployment governance.
- auditability across many agents.
- shared agent templates.

Guild is not the visual Slack-like UI. Render/React/OpenUI create the user experience. Guild is the runtime/control layer behind the agents that appear inside that UI.

Docs: https://www.guild.ai/

## Company Chat LLM Flow

The Slack-like UI uses this path:

1. Recruiter types in a job channel.
2. React frontend sends the message to the Yougrep backend.
3. Backend validates the Better Auth session and organization membership.
4. Backend invokes the Guild-managed job-channel agent.
5. Guild runs the correct agent version with scoped access.
6. The agent calls the LLM through TrueFoundry.
7. The agent calls Airbyte tools when it needs connector data/actions.
8. The agent returns normal text plus OpenUI Lang.
9. Backend stores the turn in Postgres.
10. Frontend renders the answer as chat text plus rich OpenUI components.

That is the core product loop.

## End-To-End Flow

1. Company user signs in through Better Auth.
2. User creates an organization or joins one.
3. User connects Notion and Greenhouse/Ashby through Airbyte.
4. User creates a job channel.
5. The channel agent reads conversation context and connector context.
6. OpenUI renders a job draft and confirmation UI.
7. Recruiter confirms posting.
8. Backend posts the job through the ATS connector.
9. Candidate clicks one-click apply.
10. Backend creates an interview session in Postgres.
11. Backend creates an ephemeral GPT Realtime 2 session credential.
12. Candidate browser connects to GPT Realtime 2 over WebRTC.
13. Voice interview runs with OpenUI exercises.
14. Transcripts, tool events, rubric signals, and exercise outputs are saved.
15. Recruiter sees applicants in the right sidebar.
16. Recruiter asks the channel agent for summaries, comparisons, and evidence.

## Deployment Blurb

Deploy Yougrep on Render as a Blueprint-backed multi-service app. The main `web` service runs the Next.js recruiter workspace, candidate interview pages, API routes, Better Auth routes, and GPT Realtime 2 session bootstrap. A separate `worker` service handles long-running jobs such as ATS posting, transcript finalization, candidate summaries, and connector refreshes. Cron jobs handle scheduled cleanup and sync. Render Postgres stores the product state, and services should use the internal database URL when they are in the same Render account and region.

Render environment variables hold Yougrep-owned credentials: Guild API keys, TrueFoundry gateway credentials, OpenAI API key, Airbyte credentials, Better Auth secret, and database URLs. In Airbyte hosted mode, Slack/Notion/GitHub/Greenhouse/Ashby connector credentials are handled by Airbyte, not stored directly by Yougrep. Yougrep stores Airbyte connector IDs and connection metadata in Postgres. Browser clients never receive long-lived secrets. Recruiter chat calls go browser -> Yougrep backend -> Guild -> TrueFoundry/Airbyte. Candidate voice calls go backend-created ephemeral credential -> browser WebRTC -> GPT Realtime 2.

## First MVP Build

Build in this order:

1. Slack-like workspace shell.
2. Better Auth organization login.
3. Postgres data model for jobs, messages, candidates, interviews.
4. Text-only channel agent.
5. OpenUI job draft and candidate summary components.
6. Airbyte Notion read and Greenhouse/Ashby post.
7. Candidate text interview with OpenUI exercises.
8. GPT Realtime 2 voice interview.
9. Recruiter review sidebar.
10. Optional ClickHouse traces.

The voice interview should come after the text interview works because the transcript/rubric/data path should be stable before adding realtime audio.
