import { modeFor } from '@yougrep/config';

export interface GuildRunMeta {
  agentType: 'job-channel' | 'interview';
  organizationId: string;
  jobChannelId?: string;
  modelName?: string;
}

export interface GuildRunResult<T> {
  guildRunId: string;
  traceId: string;
  latencyMs: number;
  result: T;
}

export interface GuildClient {
  run<T>(meta: GuildRunMeta, exec: () => Promise<T>): Promise<GuildRunResult<T>>;
}

// ---------------------------------------------------------------------------
// Shared execution wrapper used by both stub and real
// ---------------------------------------------------------------------------

async function executeTracked<T>(
  meta: GuildRunMeta,
  exec: () => Promise<T>,
): Promise<GuildRunResult<T>> {
  const guildRunId = crypto.randomUUID();
  const traceId = crypto.randomUUID();
  const start = performance.now();

  const result = await exec();

  const latencyMs = performance.now() - start;

  return { guildRunId, traceId, latencyMs, result };
}

// ---------------------------------------------------------------------------
// Stub implementation — same behaviour as real (governance/tracing is the delta)
// ---------------------------------------------------------------------------

function makeStubClient(): GuildClient {
  return {
    run: executeTracked,
  };
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

function makeRealClient(): GuildClient {
  return {
    async run(meta, exec) {
      const runResult = await executeTracked(meta, exec);

      // TODO: report trace to Guild API
      // POST https://api.guild.ai/v1/runs  { guildRunId, traceId, meta, latencyMs }
      // using GUILD_API_KEY and GUILD_WORKSPACE_ID from env.

      return runResult;
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getGuildClient(): GuildClient {
  return modeFor('guild') === 'live' ? makeRealClient() : makeStubClient();
}
