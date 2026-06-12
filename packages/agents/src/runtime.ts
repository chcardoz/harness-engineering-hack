import { getDb, agentRuns } from '@yougrep/db';
import { getEnv } from '@yougrep/config';
import { createLogger } from '@yougrep/logger';
import {
  getGuildClient,
  getPioneerClient,
  type ChatMessage,
  type GuildRunMeta,
} from '@yougrep/integrations';

const log = createLogger('agents:runtime');

/**
 * Shared agent runtime: wrap a unit of agent work in the Guild control-plane
 * (tracing/governance) and persist an `agent_runs` row. This is the single
 * place either agent records a trace, so the model path stays consistent:
 *   backend → Guild → Pioneer → provider.
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
  const runLog = log.child(meta.agentType, {
    organizationId: meta.organizationId,
    jobChannelId: meta.jobChannelId,
  });
  runLog.info('agent run start');
  let run;
  try {
    run = await guild.run(meta, async () => {
      const out = await exec();
      toolCalls = out.toolCalls ?? [];
      return out.result;
    });
  } catch (err) {
    runLog.error('agent run failed', { err });
    throw err;
  }
  runLog.info('agent run done', { latencyMs: Math.round(run.latencyMs), toolCalls: toolCalls.length });

  const db = getDb();
  const [row] = await db
    .insert(agentRuns)
    .values({
      organizationId: meta.organizationId,
      agentType: meta.agentType,
      jobChannelId: meta.jobChannelId ?? null,
      guildRunId: run.guildRunId,
      traceId: run.traceId,
      modelProvider: 'pioneer',
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
 * Produce conversational prose through the Pioneer gateway. In live mode this
 * is a real model completion; in stub mode the gateway echoes, so we detect
 * that and fall back to the supplied deterministic template. This keeps the
 * demo deterministic while genuinely exercising the model path when keys are
 * present.
 */
export async function narrate(input: {
  systemPrompt: string;
  userPrompt: string;
  fallback: string;
}): Promise<string> {
  const client = getPioneerClient();
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
  } catch (err) {
    log.warn('narrate fell back to template', { err });
    return input.fallback;
  }
}
