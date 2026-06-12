# Yougrep Buildout — STATUS

Live task list + progress. This is the **resume artifact**: if context compacts, read this + `git log` to continue.

Legend: ⬜ todo · 🟡 in progress · ✅ done · 🧪 needs test/lint · ⛔ blocked

## Decisions / deviations from blueprint (deliberate, given local env)

- **DB = PGlite** (`@electric-sql/pglite` + `drizzle-orm/pglite`). No Docker/psql on this machine. Single Next.js process owns the DB via an HMR-safe `globalThis` singleton. File-backed under `.data/pglite`. Render path would swap the driver to node-postgres (left as a TODO in `packages/db`).
- **Monorepo via pnpm workspaces**, Next.js `transpilePackages` consumes `@yougrep/*` source directly (no per-package build step). Worker runs via `tsx`.
- **Integrations stubbed** (`INTEGRATIONS_MODE=stub` default): Guild, TrueFoundry, Airbyte, OpenAI Realtime each have a real + stub impl behind one interface. Stub agent produces deterministic OpenUI.
- **Dev port** = `${CONDUCTOR_PORT:-3000}`.
- Fonts: Geist (body) + pixel display (hero). Icons: Phosphor. Animations: `motion/react`.

## Phase 0 — Foundation (MAIN LOOP, blocks everything) ✅

- ✅ AGENTS.md buildout rules + STATUS.md
- ✅ pnpm workspace root (package.json, pnpm-workspace.yaml, tsconfig.base, .gitignore, prettier/eslint)
- ✅ `packages/config` — env loader + constants
- ✅ `packages/db` — Drizzle schema (21 tables), PGlite client singleton, embedded-SQL migration, reset script
- ✅ `packages/auth` — Better Auth (Organization plugin) over Drizzle/PGlite + permissions (signup verified)
- ✅ Minimal Next.js `apps/web` boots on turbopack; `/api/health` 200, landing 200
  - NOTE: must use `next dev --turbopack` — webpack bundles PGlite and breaks its WASM URL loading. Turbopack + pglite as direct web dep works.
  - NOTE: no `instrumentation.ts` (its separate compile bundles pglite); migrate lazily via `ensureMigrated()` in routes.

## Phase 1 — Parallel package buildout (SUBAGENTS, fan out once Phase 0 green)

- ✅ `packages/integrations` — guild / truefoundry / airbyte / openai-realtime adapters (real+stub) + fixtures + 16 contract tests
- ✅ `packages/domain` — jobs, candidates, interviews, messages, connectors, postings (tenant-scoped) + 22 tenant-scoping tests
- ✅ `packages/openui` — 17 components (recruiter + interview), OpenUIRenderer w/ validateNode fallback, fixtures (incl. malformed)
- ✅ `packages/agents` — job-channel agent (intent routing → OpenUI, draft/publish-with-confirm-gate, review/compare) + isolated interview agent (consent → scored question walk → result package) + scoring + rubric/plan builder + Guild-wrapped agent_runs tracing. 9 agent tests. Gate green: lint/typecheck/**47 tests**/format ✅
  - NOTE: agents are deterministic planners; `narrate()` calls TrueFoundry but falls back to templates in stub mode (detects `[stub]` prefix). Interview agent imports ONLY plan+session domain fns (isolation enforced at module level).
  - Added domain helpers: `getOrganizationById`/`getOrganizationBySlug` (orgs.ts), `listInterviewScores`.

## Phase 2 — Web app surfaces (mix; UI in main loop w/ agent-browser)

- ✅ Landing page — clean, Geist + Pixelify hero wordmark (green "grep" accent), motion animations, connector/company/stack logos, footer. Verified in agent-browser.
- ✅ Auth pages (sign up / sign in / create org) — verified end-to-end in agent-browser (signup → onboarding → workspace).
- ✅ Recruiter workspace shell (Slack-like sidebar, channel list, inline create channel).
- ✅ Channel chat + agent + OpenUI rendering + publish flow (confirm gate) — agent distills brief, drafts listing, publishes through an explicit `alertdialog` confirm gate.
- ✅ Public job board `/c/{org-slug}` + `/c/{org-slug}/{job-slug}` — published role renders; apply panel mints interview session.
- ✅ Candidate apply + text interview (OpenUI exercises) + email gate — consent → self-rating → MVCC → SQL editor → replication architecture → timed exercise → auto-finalized result package.
- ✅ Recruiter review sidebar (candidates, pipeline, scorecards, rubric breakdown) — Marco Reyes 98/100 "Strong yes" surfaced after interview.
- ⬜ Voice interview (GPT Realtime 2 WebRTC, ephemeral cred) — stretch

  - **FIX (server/client boundary):** server routes imported `@yougrep/agents` → `@yougrep/openui` barrel, which re-exports the React **client** component libraries (`useState`) — pulling client components into a server-only API route → 500 on channel create. Added a server-safe `@yougrep/openui/contract` subpath (types + `doc`/`node`/`validateNode` only, zod-only deps) and pointed all server-side agent/route imports at it. Caught live in the agent-browser walkthrough.

## Phase 3 — Worker, infra, polish ✅

- ✅ `apps/worker` (`@yougrep/worker`) — background reconciliation tier as an in-process Postgres poll loop ("stub queue"). `reconcileInterviews({organizationIds})` is the loop-free, testable unit: finds `completed` sessions with no result package and finalizes them (idempotent — gated on `getResultPackageForSession === null`). `runtime.ts` schedules non-overlapping passes w/ graceful SIGINT/SIGTERM; `once.ts` is the one-shot cron entry. Tenant-scoped enumeration. Verified: `start:once` → `orgs=1 examined=3 finalized=0` (all inline-finalized).
- ✅ `render.yaml` blueprint — `web` (Next.js, healthCheck `/api/health`), `worker`, `cron` (`*/30`), Postgres, Key Value. Secrets `sync:false`; `DATABASE_URL`/`REDIS_URL` wired `fromDatabase`/`fromService`. node-postgres driver swap remains the documented packages/db TODO.
- ✅ Seed script (`pnpm --filter @yougrep/db seed`) — recruiter `demo@yougrep.dev` / `yougrep-demo-1234`, org **Northwind Data** (`northwind-data`), connectors, "Senior Postgres Engineer" channel **published through the real agent path**, and **3 candidates with a full recommendation spread**: Priya 100 "Strong yes" / Marcus 52 "Maybe" / Sofia 40 "No" — exercises all three scorecard states. Verified end-to-end in agent-browser (login → workspace → populated review sidebar).

  - **FIX (shared local DB):** relative `PGLITE_DATA_DIR` resolved against each package's cwd, so `pnpm --filter` gave web / worker / seed three _isolated_ `.data/pglite` databases. `getEnv()` now anchors a relative data dir to the monorepo root (walks up for `pnpm-workspace.yaml`); absolute paths (vitest temp dirs) pass through. One shared DB across all processes.
  - **FIX (fresh-login org):** `getSessionContext` resolved org only from `session.activeOrganizationId`, so any account without an active org set (seed-provisioned, or a returning user on a recreated session) hit `/onboarding` despite valid membership. Now falls back to the user's oldest membership — still membership-gated.

## Phase 4 — Quality gates (MAIN LOOP)

- ✅ Typecheck + lint + format across repo; fix all (both typechecks, eslint --max-warnings 0, prettier --check clean)
- ✅ Unit + integration + contract tests pass (47 tests)
- ✅ agent-browser walkthrough of full demo flow (ONE session) — signup → org → channel → draft → publish (confirm gate) → board → apply → interview (5 exercises) → review scorecard. Caught + fixed the server/client boundary bug above.
- ✅ web-design-guidelines audit (Web Interface Guidelines) on changed UI; fixes landed. Already strong (global `:focus-visible` ring, `prefers-reduced-motion`, labeled forms, `aria-invalid`/`role="alert"`, semantic OpenUI components confirmed via a11y tree). Fixed: `transition: all` → explicit props; focus-first-error + `inputMode`/`spellCheck={false}` on the apply email; `role="progressbar"` + `aria-valuenow` on interview progress; `aria-live` on interview loading; `aria-hidden` on decorative Phosphor icons (Phosphor renders role-less svg, no default hiding); `role="status"` + `aria-label` on the chat typing indicator.
- ⬜ Final commit + README

## Git commits (landed)

- `Phase 0: monorepo foundation — config, db (PGlite/Drizzle), auth (Better Auth), web boot`
- `Phase 1a: integrations, domain, openui packages + landing page`
- `Landing: fix hero pixel font (Pixelify Sans via --font-pixel-src)`
- `Phase 1b: agents package — job-channel + isolated interview agents (47 tests green)`
- `Phase 2: web surfaces — auth, workspace, channel agent, board, interview, review`
- `Fix: server-safe @yougrep/openui/contract subpath (keep client components out of server routes)`
- `Phase 3: worker (reconcile loop + cron), render.yaml blueprint, demo seed; shared-DB + fresh-login fixes`
