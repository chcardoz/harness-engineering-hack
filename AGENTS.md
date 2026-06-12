# AGENTS.md

> Status: **pre-implementation.** This repo currently holds stack research in `docs/`. No application code exists yet. Build against the blueprint below.

## Product

**Yougrep** is a recruiter-agent workspace for companies hiring technical talent. It feels like a Slack workspace where **every channel is one job opening**, and each channel has a long-running agent that knows the role, company context (via connectors), candidates, and interview history.

Two surfaces:
- **Recruiter workspace** — Slack-like dashboard: create job channels, talk to the channel agent, draft listings, publish to the org's own job board, review candidates.
- **Candidate interview** — from the org's public job board, a one-click entry into a live voice interview (GPT Realtime 2 over WebRTC) with generated UI exercises.

## Stack

| Role | Choice |
| --- | --- |
| Language / app | TypeScript, Next.js (web), Node worker |
| Auth + tenancy | Better Auth (Organization plugin) |
| Source of truth | Postgres |
| Generated UI | OpenUI (Thesys `openui-lang`) |
| Agent control plane | Guild AI (`guild.ai`) |
| LLM gateway (text) | TrueFoundry (OpenAI-compatible) |
| Voice interview | OpenAI Realtime API, `gpt-realtime-2`, WebRTC + backend ephemeral credential |
| Connectors | Airbyte — **read-only** (Notion/GitHub/Slack context; optional Greenhouse/Ashby import) |
| Hosting | Render (Blueprint `render.yaml`: `web`, `worker`, `cron`, Postgres, Key Value) |
| Analytics (optional) | ClickHouse (traces/events only; not app state) |

## Key Architecture Decisions (don't violate)

- **Owned job board, not external ATS posting.** Yougrep hosts its own public board at `/c/{org-slug}` and `/c/{org-slug}/{job-slug}`. Airbyte connectors are **read-only**; ATS write-back is deferred. See [docs/job-board.md](./docs/job-board.md).
- **Tenant boundary.** Every product query is scoped by `organization_id`; the backend checks membership before returning anything.
- **Agent isolation.** The interview agent never sees the raw recruiter thread or full connector data — only a distilled job brief + rubric, passed via persisted handoff objects in Postgres.
- **Model paths.** Text: backend → Guild agent → TrueFoundry → provider. Voice: browser → OpenAI Realtime over WebRTC using a backend-minted ephemeral credential. The browser never holds long-lived secrets.
- **OpenUI** renders only predefined components — never arbitrary model-generated code. Mutations (publish, outreach, reject) require explicit confirmation.

## Where To Find Things

- **All design/stack docs:** [`docs/`](./docs/) — start at [docs/index.md](./docs/index.md).
- **Architecture & build order:** [docs/mvp-architecture.md](./docs/mvp-architecture.md).
- **Repo shape, data model, agent wiring, env vars:** [docs/implementation-blueprint.md](./docs/implementation-blueprint.md).
- **Per-component detail:** one doc each — `render.md`, `better-auth.md`, `airbyte.md`, `openui.md`, `guild-ai.md`, `truefoundry.md`, `clickhouse.md`, `voice-model-providers.md`, `job-board.md`.
- **Code (once built):** monorepo per the blueprint — `apps/web`, `apps/worker`, `packages/{agents,db,auth,openui,domain,integrations,config}`.

## Local Development

Closed loop: change code, run it fully locally with external services stubbed, observe deterministic pass/fail, iterate. Never test in production on Render.

- Backend: typecheck + lint → unit tests → integration tests against local Postgres, all with `INTEGRATIONS_MODE=stub` (no keys needed).
- UI: Next.js dev server + browser-driving tooling against `localhost`; render OpenUI from fixture payloads.

### Skills for the dev loop

Two installed skills (in `.claude/skills/`) are the preferred tools for the UI side of the loop:

- **`agent-browser`** — drive a real browser against `localhost` to navigate the recruiter workspace, the public job board (`/c/{org-slug}`), and the candidate interview, fill forms, click, and screenshot. Use it to verify UI work, do exploratory/QA testing, and dogfood flows. Prefer it over any built-in browser/web tooling.
- **`web-design-guidelines`** — review/audit UI code against Web Interface Guidelines (accessibility, performance, UX). Run it on changed UI components before considering frontend work done.

Loop: build → `agent-browser` to see it render and behave → `web-design-guidelines` to audit it → fix → repeat.

Full guide: [docs/local-dev.md](./docs/local-dev.md).

## Working Agreement

Before building, read the relevant `docs/` file — the stack has been fact-checked (June 2026) and these decisions are deliberate. Do not introduce alternative stack components or revive external-ATS posting. Keep edits consistent with the boundaries above.
