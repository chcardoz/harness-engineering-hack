import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Find the monorepo root by walking up from `process.cwd()` for the
 * pnpm workspace marker. Packages are launched with different working
 * directories (e.g. `pnpm --filter @yougrep/web` runs in apps/web, `--filter
 * @yougrep/db` in packages/db), so a relative PGLITE_DATA_DIR like
 * `.data/pglite` would otherwise resolve to a *different*, isolated database
 * per package — the web app, the seed script, and the worker would never share
 * state. Anchoring relative paths to the workspace root gives every process one
 * shared local database. Absolute paths (e.g. a vitest temp dir) pass through.
 */
function repoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return process.cwd(); // no marker found; fall back to cwd
    dir = parent;
  }
}

/**
 * Central environment contract. Everything external is optional because the
 * default local loop runs with `INTEGRATIONS_MODE=stub` and PGlite — no keys
 * required. Real values are only needed for `live` smoke checks / Render.
 */
const IntegrationMode = z.enum(['stub', 'live']);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Integration switch (global + per-service overrides)
  INTEGRATIONS_MODE: IntegrationMode.default('stub'),
  GUILD_MODE: IntegrationMode.optional(),
  TRUEFOUNDRY_MODE: IntegrationMode.optional(),
  PIONEER_MODE: IntegrationMode.optional(),
  AIRBYTE_MODE: IntegrationMode.optional(),
  COMPOSIO_MODE: IntegrationMode.optional(),
  OPENAI_REALTIME_MODE: IntegrationMode.optional(),

  // Database — PGlite file dir locally; a real postgres URL on Render.
  DATABASE_URL: z.string().optional(),
  PGLITE_DATA_DIR: z.string().default('.data/pglite'),

  // Auth
  BETTER_AUTH_SECRET: z.string().default('dev-insecure-secret-change-me-please-0000000000'),
  BETTER_AUTH_URL: z.string().optional(),

  // External services (only needed in live mode)
  GUILD_API_KEY: z.string().optional(),
  GUILD_WORKSPACE_ID: z.string().optional(),
  // TrueFoundry — legacy LLM gateway, being replaced by Pioneer.
  TRUEFOUNDRY_GATEWAY_BASE_URL: z.string().optional(),
  TRUEFOUNDRY_API_KEY: z.string().optional(),
  // Pioneer — LLM gateway (OpenAI-compatible, X-API-Key auth).
  PIONEER_API_KEY: z.string().optional(),
  PIONEER_BASE_URL: z.string().default('https://api.pioneer.ai/v1'),
  OPENAI_API_KEY: z.string().optional(),
  // Airbyte — legacy read-only connectors, being replaced by Composio.
  AIRBYTE_API_KEY: z.string().optional(),
  AIRBYTE_WORKSPACE_ID: z.string().optional(),
  AIRBYTE_ORGANIZATION_ID: z.string().optional(),
  AIRBYTE_CONNECTOR_IDS_JSON: z.string().optional(),
  // Composio — per-end-user connected accounts (GitHub/Notion/Linear).
  COMPOSIO_API_KEY: z.string().optional(),
  // JSON map of toolkit slug → Composio auth-config id, e.g.
  // {"github":"ac_...","notion":"ac_...","linear":"ac_..."} (from the dashboard).
  COMPOSIO_AUTH_CONFIGS_JSON: z.string().optional(),
  // ClickHouse — analytics / CDC target queried by the channel agent.
  CLICKHOUSE_URL: z.string().optional(),
  CLICKHOUSE_USER: z.string().optional(),
  CLICKHOUSE_PASSWORD: z.string().optional(),

  // Models
  TEXT_MODEL: z.string().default('gpt-4o'),
  VOICE_MODEL: z.string().default('gpt-realtime-2'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;
let dotenvLoaded = false;

/**
 * Load the single root `.env` once, so every process — web, worker, and the
 * tsx-run scripts — reads the same pasted keys. `dotenv` does NOT override
 * variables already present in `process.env`, so real environment values
 * (Render dashboard, CI, an explicit `KEY=… pnpm …`) always win over the file.
 */
function ensureDotenv(): void {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  // Tests are hermetic: they set modes explicitly (vitest `test.env`) and must
  // not inherit the developer's real `.env` (which flips services to `live`).
  if (process.env['NODE_ENV'] === 'test') return;
  loadDotenv({ path: resolve(repoRoot(), '.env') });
}

export function getEnv(): Env {
  if (cached) return cached;
  ensureDotenv();
  const parsed = EnvSchema.parse(process.env);
  // Anchor a relative PGlite data dir to the workspace root so every package
  // process (web, worker, seed, scripts) shares one local database.
  if (!isAbsolute(parsed.PGLITE_DATA_DIR)) {
    parsed.PGLITE_DATA_DIR = resolve(repoRoot(), parsed.PGLITE_DATA_DIR);
  }
  cached = parsed;
  return cached;
}

export type IntegrationModeValue = z.infer<typeof IntegrationMode>;

/** Resolve the effective mode for a single service, honoring per-service overrides. */
export function modeFor(
  service:
    | 'guild'
    | 'truefoundry'
    | 'pioneer'
    | 'airbyte'
    | 'composio'
    | 'openaiRealtime',
  env: Env = getEnv(),
): IntegrationModeValue {
  switch (service) {
    case 'guild':
      return env.GUILD_MODE ?? env.INTEGRATIONS_MODE;
    case 'truefoundry':
      return env.TRUEFOUNDRY_MODE ?? env.INTEGRATIONS_MODE;
    case 'pioneer':
      return env.PIONEER_MODE ?? env.INTEGRATIONS_MODE;
    case 'airbyte':
      return env.AIRBYTE_MODE ?? env.INTEGRATIONS_MODE;
    case 'composio':
      return env.COMPOSIO_MODE ?? env.INTEGRATIONS_MODE;
    case 'openaiRealtime':
      return env.OPENAI_REALTIME_MODE ?? env.INTEGRATIONS_MODE;
  }
}
