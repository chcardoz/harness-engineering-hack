import { getEnv, modeFor } from '@yougrep/config';
import { createLogger } from '@yougrep/logger';

const log = createLogger('integrations:pioneer');

/**
 * Pioneer — the text LLM gateway (replaces TrueFoundry).
 *
 * Pioneer is OpenAI-compatible at `${PIONEER_BASE_URL}/chat/completions`, with
 * ONE difference from OpenAI: auth is the `X-API-Key` header, not
 * `Authorization: Bearer`. The request/response envelopes — including
 * `tools`/`tool_choice` and `tool_calls` — match OpenAI, so this client doubles
 * as the model leg of the agent tool-calling loop.
 *
 * Tool calling is not documented by Pioneer but works for tool-capable
 * passthrough models (e.g. gpt-4.1 / claude-*). `probeToolCalling()` fails loud
 * if the configured model can't return well-formed tool_calls.
 */

export interface ToolCall {
  id: string;
  /** Function name the model wants to call. */
  name: string;
  /** Raw JSON-string arguments, parsed by the caller. */
  arguments: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Set on `tool` messages: which tool_call this result answers. */
  tool_call_id?: string;
  /** Set on `assistant` messages that requested tool calls (loop replay). */
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResult {
  text: string;
  model: string;
  /** Present when the model requested one or more tool calls. */
  toolCalls: ToolCall[];
  /** OpenAI finish_reason, e.g. 'stop' | 'tool_calls'. */
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  jsonSchemaName?: string;
  /** Tools the model may call this turn. */
  tools?: ToolDef[];
  /** How the model should use tools. Defaults to 'auto' when tools are given. */
  toolChoice?: 'auto' | 'required' | 'none';
}

export interface PioneerClient {
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

function makeRealClient(): PioneerClient {
  return {
    async chat(messages, opts = {}) {
      const env = getEnv();
      const baseUrl = env.PIONEER_BASE_URL;
      const apiKey = env.PIONEER_API_KEY;

      if (!apiKey) {
        throw new Error('Pioneer live mode not configured: set PIONEER_API_KEY');
      }

      const model = opts.model ?? env.TEXT_MODEL;
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: opts.temperature ?? 0.7,
      };

      if (opts.jsonSchemaName) {
        body['response_format'] = {
          type: 'json_schema',
          json_schema: { name: opts.jsonSchemaName, strict: true },
        };
      }

      if (opts.tools?.length) {
        body['tools'] = opts.tools;
        body['tool_choice'] = opts.toolChoice ?? 'auto';
      }

      const startedAt = Date.now();
      log.debug('chat request', {
        model,
        messages: messages.length,
        tools: opts.tools?.length ?? 0,
      });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pioneer's one divergence from OpenAI: X-API-Key, not Bearer.
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '(no body)');
        log.error('chat request failed', {
          model,
          status: response.status,
          statusText: response.statusText,
          body: text.slice(0, 500),
          ms: Date.now() - startedAt,
        });
        throw new Error(
          `Pioneer chat request failed: ${response.status} ${response.statusText} — ${text}`,
        );
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content: string | null;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason: string | null;
        }>;
        model: string;
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      const choice = data.choices[0];
      const message = choice?.message;
      const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

      log.debug('chat ok', {
        model: data.model ?? model,
        finishReason: choice?.finish_reason ?? null,
        toolCalls: toolCalls.length,
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        ms: Date.now() - startedAt,
      });

      return {
        text: message?.content ?? '',
        model: data.model ?? model,
        toolCalls,
        finishReason: choice?.finish_reason ?? null,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Stub implementation — deterministic, no network
// ---------------------------------------------------------------------------

function makeStubClient(): PioneerClient {
  return {
    async chat(messages, opts = {}) {
      const env = getEnv();
      const model = opts.model ?? env.TEXT_MODEL;
      const lastUserMessage =
        [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      const preview =
        lastUserMessage.length > 80 ? `${lastUserMessage.slice(0, 80)}…` : lastUserMessage;

      // If tools are offered, the stub deterministically "calls" the first one
      // with empty args so the agent loop can be exercised without a network.
      // Once a tool result is already in the transcript, it stops calling and
      // answers — so the loop terminates after exactly one tool round offline.
      const alreadyHasToolResult = messages.some((m) => m.role === 'tool');
      if (opts.tools?.length && !alreadyHasToolResult) {
        const first = opts.tools[0]!;
        return {
          text: '',
          model,
          toolCalls: [{ id: 'stub_call_1', name: first.function.name, arguments: '{}' }],
          finishReason: 'tool_calls',
          usage: { promptTokens: 42, completionTokens: 8 },
        };
      }

      const text = opts.jsonSchemaName
        ? `{"stub":true,"echo":"${preview.replace(/"/g, "'")}","schema":"${opts.jsonSchemaName}"}`
        : `[stub] Received: "${preview}". This is a deterministic stub response from the Pioneer adapter.`;

      return {
        text,
        model,
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 42, completionTokens: 24 },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Factory + probe
// ---------------------------------------------------------------------------

export function getPioneerClient(): PioneerClient {
  return modeFor('pioneer') === 'live' ? makeRealClient() : makeStubClient();
}

/**
 * Single-shot check that the configured model actually returns OpenAI-style
 * tool_calls. Used by `pnpm test:keys` and on agent boot so a model that can't
 * tool-call fails loud rather than silently degrading the agent loop.
 */
export async function probeToolCalling(): Promise<{ ok: boolean; detail: string }> {
  const client = getPioneerClient();
  const tools: ToolDef[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get the current weather for a city.',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
      },
    },
  ];

  try {
    const res = await client.chat(
      [{ role: 'user', content: 'What is the weather in Paris? Use the tool.' }],
      { tools, toolChoice: 'required', temperature: 0 },
    );
    if (res.toolCalls.length > 0 && res.toolCalls[0]?.name === 'get_weather') {
      return { ok: true, detail: `model '${res.model}' returned a well-formed tool_call` };
    }
    return {
      ok: false,
      detail: `model '${res.model}' did not return tool_calls (finish_reason=${res.finishReason}, text="${res.text.slice(0, 80)}")`,
    };
  } catch (err) {
    return { ok: false, detail: `probe failed: ${(err as Error).message}` };
  }
}
