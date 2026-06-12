# Yougrep Recruiter Agent MVP Architecture

## Product Summary

Yougrep is a Slack-like recruiting workspace where each channel represents one job. A company user creates a job channel, connects company tools, talks to a channel-specific agent, generates a job listing, posts it to an ATS/job board, and later reviews candidates who completed an agent-led interview.

Candidate flow: a candidate sees the listing, clicks a one-click apply or skip-the-line entry point, enters a live interview with a voice/text agent, interacts with generated UI exercises, and receives a closing message. Recruiters return to the job channel and ask the agent which candidates fit best and why.

## Recommended MVP Stack Roles

- Render: deploy the web app, API/WebSocket service, worker, cron, and managed Postgres.
- Better Auth: login, organization creation, memberships, and tenant boundaries.
- Postgres: source of truth for users, organizations, jobs/channels, messages, candidates, interviews, applications, auth state, and workflow state.
- OpenUI: generated UI inside recruiter chat and candidate interview flows.
- Airbyte: connector layer for Notion, Slack, GitHub, Greenhouse/Ashby, and later replication/search.
- Guild: agent control plane for the job-channel agent and interview agent definitions, tool permissions, versions, and traces.
- TrueFoundry: LLM gateway and model routing for non-realtime text/model calls from Guild-managed agents.
- Voice provider: GPT Realtime 2 for the live candidate interview after the text interview flow works.
- ClickHouse: optional analytics/trace/event store.

## MVP Sequence

1. Build the web product shell.
   - Slack-like left sidebar.
   - one job per channel.
   - central long-running conversation.
   - right sidebar with applicants/interviews.

2. Add auth and tenant model.
   - Better Auth users and organizations.
   - all jobs, connectors, candidates, and messages scoped by `organization_id`.

3. Add job-channel agent.
   - text chat first through a Guild-managed job-channel agent.
   - route model calls through TrueFoundry.
   - store all messages in Postgres.
   - agent can draft a job listing from conversation context.

4. Add OpenUI components.
   - job draft card.
   - connector status.
   - candidate card.
   - interview question card.
   - score summary.

5. Add first connector path.
   - Notion read for job requirements.
   - Greenhouse or Ashby create/update job/application.
   - avoid LinkedIn for MVP because official Airbyte recruiting/job posting support was not found.

6. Add candidate apply/interview.
   - public apply link.
   - candidate session.
   - text interview first, voice later.
   - structured interview transcript and rubric in Postgres.

7. Add recruiter review.
   - right sidebar applicant list.
   - summaries, evidence, transcript references, and rubric scores.
   - agent answers questions about candidate fit using stored interview context.

8. Add observability/improvement.
   - start with Postgres audit logs.
   - add ClickHouse when traces/events become useful.
   - choose a model-improvement/evaluation path after there is labeled feedback.

## Chat LLM Call Path

The Slack-like company chat should not call a model directly from the browser.

1. Recruiter sends a message in a job channel.
2. Yougrep backend authenticates the user with Better Auth and loads the organization/job context from Postgres.
3. Backend invokes the Guild-managed job-channel agent for that job.
4. Guild applies the agent version, tool scope, credentials/policies, and trace context.
5. The Guild agent calls the LLM through TrueFoundry's OpenAI-compatible gateway.
6. The agent calls Airbyte tools when it needs Notion, Slack, GitHub, Greenhouse, or Ashby data/actions.
7. The agent returns text plus OpenUI Lang for rich UI responses.
8. Yougrep stores the message, tool calls, and agent output in Postgres.
9. The frontend renders text normally and renders OpenUI Lang with the OpenUI React renderer.

## Voice Interview Note

Use GPT Realtime 2 for the live candidate interview. For the first MVP, implement text interview plus OpenUI exercises before adding voice. Once the transcript, rubric, and exercise-output path is stable, add GPT Realtime 2 over WebRTC and keep the same backend persistence path.

## Data Model Sketch

Core Postgres entities:

- `users`
- `organizations`
- `memberships`
- `connector_accounts`
- `job_channels`
- `channel_messages`
- `agent_runs`
- `job_listings`
- `candidates`
- `applications`
- `interview_sessions`
- `interview_turns`
- `interview_scores`
- `candidate_summaries`
- `audit_events`

Optional ClickHouse events:

- `agent_events`
- `llm_traces`
- `tool_call_events`
- `interview_events`
- `connector_sync_events`
- `funnel_events`

## First Demo Scope

Recommended first demo:

- recruiter signs in and creates an organization.
- recruiter creates a "Postgres engineer" channel.
- recruiter asks the agent to read Notion requirements.
- agent drafts a listing with OpenUI.
- recruiter confirms posting to Greenhouse/Ashby.
- candidate clicks apply and completes a text interview with OpenUI problem cards.
- recruiter sees candidates in the right sidebar.
- recruiter asks which candidate is strongest and gets an evidence-backed answer.

Out of scope for first demo:

- multiplayer teammate chat.
- real LinkedIn posting.
- self-improving model loop.
- full voice interview.
- full enterprise agent governance.
- broad historical replication across every company tool.

## Main Risks

- Recruiting and interview data is sensitive. Build tenant isolation and audit logs early.
- Generated candidate scoring can create fairness and compliance risk. Keep human review in the loop.
- Tool mutations need confirmation gates.
- OpenUI output can fail validation; the app needs graceful fallback.
- Connectors require careful OAuth scope management.
