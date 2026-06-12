import { getDb, agentRuns } from '@yougrep/db';
import { getEnv } from '@yougrep/config';
import {
  getGuildClient,
  getTrueFoundryClient,
  type ChatMessage,
  type GuildRunMeta,
} from '@yougrep/integrations';

/**
 * Shared agent runtime: wrap a unit of agent work in the Guild control-plane
 * (tracing/governance) and persist an `agent_runs` row. This is the single
 * place either agent records a trace, so the model path stays consistent:
 *   backend → Guild → TrueFoundry → provider.
 */

export interface AgentRunHandle<T> {
  agentRunId: string;
  guildRunId: string;
  traceId: string;
  latencyMs: number;
  result: T;
}

export async function withAgentRun<T>(
  meta: GuildRunMeta,
  exec: () => Promise<{ result: T; toolCalls?: string[] }>,
): Promise<AgentRunHandle<T>> {
  const env = getEnv();
  const guild = getGuildClient();

  let toolCalls: string[] = [];
  const run = await guild.run(meta, async () => {
    const out = await exec();
    toolCalls = out.toolCalls ?? [];
    return out.result;
  });

  const db = getDb();
  const [row] = await db
    .insert(agentRuns)
    .values({
      organizationId: meta.organizationId,
      agentType: meta.agentType,
      jobChannelId: meta.jobChannelId ?? null,
      guildRunId: run.guildRunId,
      traceId: run.traceId,
      modelProvider: 'truefoundry',
      modelName: meta.modelName ?? env.TEXT_MODEL,
      status: 'completed',
      latencyMs: Math.round(run.latencyMs),
      toolCalls,
      metadata: { toolCallCount: toolCalls.length },
    })
    .returning();

  if (!row) throw new Error('Failed to record agent run');

  return {
    agentRunId: row.id,
    guildRunId: run.guildRunId,
    traceId: run.traceId,
    latencyMs: run.latencyMs,
    result: run.result,
  };
}

/**
 * Produce conversational prose through the TrueFoundry gateway. In live mode
 * this is a real model completion; in stub mode the gateway echoes, so we
 * detect that and fall back to the supplied deterministic template. This keeps
 * the demo deterministic while genuinely exercising the model path when keys
 * are present.
 */
export async function narrate(input: {
  systemPrompt: string;
  userPrompt: string;
  fallback: string;
}): Promise<string> {
  const client = getTrueFoundryClient();
  const messages: ChatMessage[] = [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.userPrompt },
  ];

  try {
    const res = await client.chat(messages, { temperature: 0.4 });
    const text = res.text.trim();
    // Stub gateway prefixes its deterministic echo; never surface that.
    if (!text || text.startsWith('[stub]') || text.startsWith('{"stub"')) {
      return input.fallback;
    }
    return text;
  } catch {
    return input.fallback;
  }
}
