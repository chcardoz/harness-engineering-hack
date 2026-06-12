import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
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
  AIRBYTE_MODE: IntegrationMode.optional(),
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
  TRUEFOUNDRY_GATEWAY_BASE_URL: z.string().optional(),
  TRUEFOUNDRY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AIRBYTE_API_KEY: z.string().optional(),
  AIRBYTE_WORKSPACE_ID: z.string().optional(),
  AIRBYTE_ORGANIZATION_ID: z.string().optional(),
  AIRBYTE_CONNECTOR_IDS_JSON: z.string().optional(),

  // Models
  TEXT_MODEL: z.string().default('gpt-4o'),
  VOICE_MODEL: z.string().default('gpt-realtime-2'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
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
  service: 'guild' | 'truefoundry' | 'airbyte' | 'openaiRealtime',
  env: Env = getEnv(),
): IntegrationModeValue {
  switch (service) {
    case 'guild':
      return env.GUILD_MODE ?? env.INTEGRATIONS_MODE;
    case 'truefoundry':
      return env.TRUEFOUNDRY_MODE ?? env.INTEGRATIONS_MODE;
    case 'airbyte':
      return env.AIRBYTE_MODE ?? env.INTEGRATIONS_MODE;
    case 'openaiRealtime':
      return env.OPENAI_REALTIME_MODE ?? env.INTEGRATIONS_MODE;
  }
}
