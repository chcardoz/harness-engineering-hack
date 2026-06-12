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
- ⬜ `packages/integrations` — guild / truefoundry / airbyte / openai-realtime adapters (real+stub) + fixtures + contract tests
- ⬜ `packages/domain` — jobs, candidates, interviews, messages, connectors, postings (tenant-scoped queries) + unit tests
- ⬜ `packages/openui` — component libraries (recruiter + interview), openui-lang renderer, fixtures (incl. malformed)
- ⬜ `packages/agents` — job-channel agent + interview agent (prompts, tools, rubrics, policies) over stub integrations

## Phase 2 — Web app surfaces (mix; UI in main loop w/ agent-browser)
- ⬜ Landing page — clean, Geist + pixel hero, motion animations, connector/company/stack logos, footer
- ⬜ Auth pages (sign up / sign in / create org)
- ⬜ Recruiter workspace shell (Slack-like sidebar, channel list, create channel)
- ⬜ Channel chat + agent + OpenUI rendering + publish flow (confirm gate)
- ⬜ Public job board `/c/{org-slug}` + `/c/{org-slug}/{job-slug}`
- ⬜ Candidate apply + text interview (OpenUI exercises) + email gate
- ⬜ Recruiter review sidebar (candidates, summaries, comparison)
- ⬜ Voice interview (GPT Realtime 2 WebRTC, ephemeral cred) — stretch

## Phase 3 — Worker, infra, polish
- ⬜ `apps/worker` — finalize interview package, summaries, board refresh (stub queue)
- ⬜ `render.yaml` blueprint + env docs
- ⬜ Seed script (org, recruiter, postgres-engineer channel, published posting, candidates w/ interviews)

## Phase 4 — Quality gates (MAIN LOOP)
- ⬜ Typecheck + lint + format across repo; fix all
- ⬜ Unit + integration + contract tests pass
- ⬜ agent-browser walkthrough of full demo flow (ONE session)
- ⬜ web-design-guidelines audit on changed UI; fix
- ⬜ Final commit + README

## Git commits (landed)
- (none yet — buildout in progress)
