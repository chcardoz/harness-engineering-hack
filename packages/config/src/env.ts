import { z } from 'zod';

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
  cached = EnvSchema.parse(process.env);
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
