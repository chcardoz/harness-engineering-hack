import { createLogger } from '@yougrep/logger';
import {
  getPioneerClient,
  type ChatMessage,
  type ToolDef,
} from '@yougrep/integrations';

const log = createLogger('agents:tool-loop');

/**
 * The agent tool-calling loop.
 *
 * This is the single place an agent reasons over tools: it calls the Pioneer
 * gateway with a set of tool schemas, executes whatever tools the model asks
 * for, feeds the results back, and repeats until the model produces a final
 * text answer (or the iteration budget is spent). Composio connectors (#3) and
 * the ClickHouse SQL tool (#4) plug in here as `AgentTool`s — the loop itself
 * is provider- and tool-agnostic.
 *
 * Tenancy/isolation is the CALLER's job: only pass the tools an agent is
 * allowed to use (e.g. the interview agent gets no recruiter connectors).
 */

export interface AgentTool {
  /** OpenAI-style function schema advertised to the model. */
  def: ToolDef;
  /** Execute the call; return the result as a string (JSON or plain text). */
  execute(args: Record<string, unknown>): Promise<string>;
}

export interface ToolLoopResult {
  /** The model's final natural-language answer. */
  text: string;
  /** Human-readable log of tool invocations, for `agent_runs.toolCalls`. */
  toolCalls: string[];
  /** How many model round-trips it took. */
  iterations: number;
}

/** Stub/empty replies we should never surface — fall back to the template. */
function isStubText(text: string): boolean {
  return !text || text.startsWith('[stub]') || text.startsWith('{"stub"');
}

export async function runToolLoop(input: {
  systemPrompt: string;
  userPrompt: string;
  tools: AgentTool[];
  /** Deterministic answer used if the model errors or only echoes a stub. */
  fallback: string;
  maxIterations?: number;
  temperature?: number;
}): Promise<ToolLoopResult> {
  const client = getPioneerClient();
  const maxIterations = input.maxIterations ?? 6;
  const temperature = input.temperature ?? 0.4;
  const toolDefs: ToolDef[] = input.tools.map((t) => t.def);
  const byName = new Map(input.tools.map((t) => [t.def.function.name, t]));

  const messages: ChatMessage[] = [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.userPrompt },
  ];
  const toolCallLog: string[] = [];

  for (let i = 0; i < maxIterations; i++) {
    let res;
    try {
      res = await client.chat(messages, {
        tools: toolDefs.length ? toolDefs : undefined,
        toolChoice: toolDefs.length ? 'auto' : undefined,
        temperature,
      });
    } catch (err) {
      log.error('chat failed mid-loop; using fallback', { iteration: i, err });
      return { text: input.fallback, toolCalls: toolCallLog, iterations: i };
    }

    // No tool calls → the model is done; return its answer.
    if (res.toolCalls.length === 0) {
      const text = res.text.trim();
      return {
        text: isStubText(text) ? input.fallback : text,
        toolCalls: toolCallLog,
        iterations: i + 1,
      };
    }

    // Replay the assistant's tool-call request (OpenAI requires the assistant
    // message bearing tool_calls to precede the tool result messages).
    messages.push({
      role: 'assistant',
      content: res.text ?? '',
      tool_calls: res.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      })),
    });

    // Execute each requested tool and append its result.
    for (const call of res.toolCalls) {
      const tool = byName.get(call.name);
      let args: Record<string, unknown> = {};
      try {
        args = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        args = {};
      }

      let content: string;
      if (!tool) {
        log.warn('model requested unknown tool', { tool: call.name });
        content = `Error: unknown tool '${call.name}'`;
      } else {
        try {
          content = await tool.execute(args);
          log.debug('tool call ok', { tool: call.name, iteration: i });
        } catch (err) {
          log.error('tool call threw', { tool: call.name, iteration: i, err });
          content = `Error: ${(err as Error).message}`;
        }
      }

      toolCallLog.push(`${call.name}(${call.arguments || '{}'})`);
      messages.push({ role: 'tool', tool_call_id: call.id, content });
    }
  }

  // Budget exhausted: ask once more with no tools to force a final answer.
  try {
    const res = await client.chat(messages, { temperature });
    const text = res.text.trim();
    return {
      text: isStubText(text) ? input.fallback : text,
      toolCalls: toolCallLog,
      iterations: maxIterations,
    };
  } catch {
    return { text: input.fallback, toolCalls: toolCallLog, iterations: maxIterations };
  }
}
