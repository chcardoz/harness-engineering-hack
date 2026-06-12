# Yougrep

**The recruiter workspace where every channel is a job.**

Yougrep is a recruiter-agent workspace for companies hiring technical talent. It
feels like a Slack workspace where **every channel is one job opening**, and each
channel has a long-running agent that knows the role, your company context (via
connectors), the candidates, and the interview history.

Two surfaces:

- **Recruiter workspace** — a Slack-like dashboard: create job channels, talk to
  the channel agent, draft listings, publish to your org's own job board, and
  review candidates with auto-generated scorecards.
- **Candidate interview** — from the org's public job board, one click into a
  structured interview with generated UI exercises (self-rating, SQL editor,
  architecture prompts, a timed exercise), scored into a recommendation.

> The UI is rendered through **OpenUI** — the agent emits a validated document of
> predefined components, never arbitrary model code. Mutations (publish, etc.)
> require an explicit confirmation step.

---

## Quickstart (≈1 minute, no keys, no Docker)

```bash
pnpm install
pnpm --filter @yougrep/db reset   # fresh local database
pnpm --filter @yougrep/db seed    # demo org + role + 3 interviewed candidates
pnpm dev                          # http://localhost:3000
```

Then sign in to the recruiter workspace:

- **Email:** `demo@yougrep.dev`
- **Password:** `yougrep-demo-1234`

You'll land in the **Northwind Data** workspace with a published _Senior Postgres
Engineer_ channel and three candidates already interviewed — a full
recommendation spread in the review sidebar (Priya **Strong yes** · Marcus
**Maybe** · Sofia **No**).

To try the candidate side, open the public board at
[`/c/northwind-data`](http://localhost:3000/c/northwind-data), pick the role, and
apply with any email to start a live interview.

> Requires Node 20+ and pnpm. The local loop runs entirely on **PGlite**
> (in-process Postgres, WASM) with all integrations **stubbed** — no external
> services or API keys needed.

---

## How it works

```
Recruiter ─▶ Next.js web ─▶ Job-channel agent ─▶ Guild (trace) ─▶ TrueFoundry ─▶ provider
                  │                  │
                  │                  └─▶ OpenUI document (validated components)
                  ▼
              Postgres ◀── distilled job brief + rubric (handoff object) ──┐
                  ▲                                                          │
Candidate ─▶ Interview agent (isolated) ─▶ scores ─▶ result package ────────┘
```

- **Owned job board, not external ATS posting.** Yougrep hosts its own board at
  `/c/{org-slug}` and `/c/{org-slug}/{job-slug}`. Connectors (Airbyte) are
  **read-only** context; ATS write-back is deferred.
- **Tenant boundary.** Every product query is scoped by `organization_id` and the
  backend checks membership before returning anything.
- **Agent isolation.** The interview agent never sees the raw recruiter thread or
  full connector data — only a distilled brief + rubric, passed as persisted
  handoff objects in Postgres.
- **Model paths.** Text: backend → agent → TrueFoundry → provider. Voice (stretch):
  browser → OpenAI Realtime over WebRTC using a backend-minted ephemeral
  credential. The browser never holds long-lived secrets.

The agents are **deterministic planners** that turn domain data into real OpenUI;
in `live` mode `narrate()` exercises the TrueFoundry text path, and in `stub` mode
it falls back to templates so the whole loop is reproducible offline.

---

## Monorepo layout

pnpm workspace; Next.js consumes the `@yougrep/*` packages as source (no per-package build).

| Package                 | Role                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/web`              | Next.js 15 (Turbopack) — recruiter workspace, public board, candidate interview, API + auth routes   |
| `apps/worker`           | Background reconciliation tier (poll loop + cron one-shot)                                           |
| `packages/config`       | Env contract (zod) + shared constants                                                                |
| `packages/db`           | Drizzle schema (22 tables), PGlite client singleton, embedded migration, `reset`/`seed` scripts      |
| `packages/auth`         | Better Auth (Organization plugin) over Drizzle/PGlite + tenant permission helpers                    |
| `packages/domain`       | Tenant-scoped data access: jobs, candidates, applications, interviews, postings, connectors, audit   |
| `packages/integrations` | Guild / TrueFoundry / Airbyte / OpenAI Realtime adapters, each real **+** stub behind one interface  |
| `packages/openui`       | OpenUI contract (zod-validated components) + recruiter/interview React libraries + renderer          |
| `packages/agents`       | Job-channel agent (intent → OpenUI, draft, confirm-gated publish, review) + isolated interview agent |

---

## Stack

| Role                      | Choice                                                         |
| ------------------------- | -------------------------------------------------------------- |
| Language / app            | TypeScript, Next.js (web), Node worker                         |
| Auth + tenancy            | Better Auth (Organization plugin)                              |
| Source of truth           | Postgres (PGlite locally; managed Postgres on Render)          |
| Generated UI              | OpenUI (predefined components only)                            |
| Agent control plane       | Guild AI (run tracing)                                         |
| LLM gateway (text)        | TrueFoundry (OpenAI-compatible)                                |
| Voice interview (stretch) | OpenAI Realtime, WebRTC + backend ephemeral credential         |
| Connectors                | Airbyte — read-only (Notion / GitHub / Slack context)          |
| Hosting                   | Render (`render.yaml`: web, worker, cron, Postgres, Key Value) |

---

## Development

A closed local loop — change code, run it fully locally with external services
stubbed, observe deterministic pass/fail, iterate. Never test in production.

```bash
pnpm typecheck        # packages (tsc -p tsconfig.json)
pnpm typecheck:web    # apps/web
pnpm lint             # eslint --max-warnings 0
pnpm format:check     # prettier --check
pnpm test             # vitest — 47 unit/integration/contract tests
pnpm worker           # run the background worker (poll loop)
```

All tests and the dev server default to `INTEGRATIONS_MODE=stub`, so no keys are
required. The local PGlite database lives at `.data/pglite` (git-ignored) and is
shared by every workspace process.

See [`docs/local-dev.md`](./docs/local-dev.md) for the full dev-loop guide
(including the `agent-browser` and `web-design-guidelines` skills), and
[`STATUS.md`](./STATUS.md) for the build log and the deliberate local-env
decisions (PGlite, stub mode, Turbopack).

### Deploying to Render

[`render.yaml`](./render.yaml) is a Blueprint that provisions a `web` service, a
`worker`, a `cron` job, managed Postgres, and a Key Value store. Secrets are
declared `sync: false` — set them in the Render dashboard. (Swapping
`packages/db`'s driver from PGlite to node-postgres for the `DATABASE_URL` path
is the one documented TODO before a production launch.)

---

## Documentation

Design and stack docs live in [`docs/`](./docs/) — start at
[`docs/index.md`](./docs/index.md). Architecture and build order are in
[`docs/mvp-architecture.md`](./docs/mvp-architecture.md); the data model, agent
wiring, and env vars are in
[`docs/implementation-blueprint.md`](./docs/implementation-blueprint.md). The
buildout's working agreement and architecture invariants are in
[`AGENTS.md`](./AGENTS.md).
