# Local Development

The goal is a **closed loop**: an agent can change code, run it fully locally, observe a deterministic pass/fail, and iterate — without ever deploying to Render. Render is for promotion after local is green, not for trying things out.

Nothing external (Guild, TrueFoundry, OpenAI Realtime, Airbyte) needs to be live to develop and test the backend. Those are reached only through adapters in `packages/integrations`, and every adapter has a stub.

## The Stub Boundary

Every external service is called through one interface in `packages/integrations/src/*` (`guild.ts`, `truefoundry.ts`, `openai-realtime.ts`, `airbyte.ts`). Each interface ships two implementations:

- a real implementation that calls the live service, and
- a stub implementation that returns deterministic fixtures.

A single env switch selects which is used:

```text
INTEGRATIONS_MODE=stub   # default for local dev and tests — no network, no keys
INTEGRATIONS_MODE=live   # real services; needs real credentials
```

Per-service overrides (`TRUEFOUNDRY_MODE`, `AIRBYTE_MODE`, …) let one service go live while the rest stay stubbed. Fixtures live next to each adapter (`packages/integrations/src/__fixtures__/`). Stubs make LLM output, connector reads, and realtime session creation reproducible, so a test asserts on a known result instead of a model's mood.

This means **no API keys are required to run the app or the test suite locally.** Keys are only needed for `INTEGRATIONS_MODE=live` smoke checks.

## What Runs Locally

| Piece | Local form |
| --- | --- |
| Postgres | Docker container (matches Render Postgres major version) |
| Key Value (Redis) | Docker container, or in-memory queue stub for unit work |
| `web` (Next.js) | `dev` server on `localhost`, binds `PORT` like Render |
| `worker` | Node process consuming the local queue |
| Guild / TrueFoundry / Airbyte / OpenAI Realtime | stub adapters (default) |

Bring up the data services with Docker Compose, run migrations against local Postgres, then start `web` and `worker`. Use the same `DATABASE_URL`/`PORT` env contract as Render so there is no behavior gap between local and deployed.

## Backend Work — How To Test

Closed loop, fastest to slowest:

1. **Typecheck + lint** — `tsc --noEmit` and the linter. First gate; cheap.
2. **Unit tests** — pure domain logic in `packages/domain` and agent prompt/tool wiring in `packages/agents`, with integrations stubbed. No DB.
3. **Integration tests** — API route handlers and queries against a **real local Postgres** (ephemeral test schema, migrated, truncated between tests). Integrations still stubbed. This covers tenant scoping (`organization_id`) — assert that a query for org A never returns org B's rows.
4. **Contract tests** — for each integration adapter, one test that the stub and the real client agree on request/response shape, so stubs do not drift from reality.
5. **Live smoke (manual, occasional)** — flip one service to `live` with real keys to confirm the real wire format. Not part of the inner loop.

Agents should run gates 1–3 on every change and treat them as the definition of "done locally."

## UI Work — How To Test

Two installed skills (in `.claude/skills/`) drive this loop:
- **`agent-browser`** — browser automation against `localhost`: navigate, fill forms, click, screenshot, QA. Prefer it over any built-in browser/web tooling.
- **`web-design-guidelines`** — audit changed UI code for accessibility / performance / UX before calling frontend work done.

1. Run the Next.js `dev` server.
2. Use **`agent-browser`** to open `localhost`, exercise the recruiter workspace, the public job board (`/c/{org-slug}` and `/c/{org-slug}/{job-slug}`), and the candidate interview surface, and screenshot to verify rendering.
3. **OpenUI**: render against fixture `openui-lang` payloads so component rendering is testable without an LLM in the loop. Keep a fixtures folder of representative payloads per component (`JobListingDraft`, `CandidateComparisonTable`, `QuestionCard`, …) including a deliberately malformed one to exercise the fallback path.
4. Run **`web-design-guidelines`** on the changed UI before considering it done.
5. The candidate voice interview needs a real ephemeral OpenAI Realtime credential and WebRTC, so it is the one surface that does not fully stub — develop the **text interview path first** (it is the default build order anyway) and treat voice as a `live`-mode smoke check.

## Seeding

Provide a seed script that creates one organization, one recruiter user, one `postgres-engineer` job channel, a published `job_board_postings` row, and a couple of fixture candidates with completed interview packages. That gives both backend tests and the UI a realistic, deterministic starting state and powers the first-demo flow end to end locally.

## Promotion To Render

Only after local gates pass: push, let the `render.yaml` Blueprint build, run migrations via `preDeployCommand`, and flip the deployed services to `INTEGRATIONS_MODE=live` with real credentials stored as Render env vars. See [Render](./render.md) and the [Implementation Blueprint](./implementation-blueprint.md) for the deployment and env-var contract.
