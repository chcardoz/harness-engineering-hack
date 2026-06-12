import { getEnv, modeFor } from '@yougrep/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface TrueFoundryClient {
  chat(
    messages: ChatMessage[],
    opts?: { model?: string; temperature?: number; jsonSchemaName?: string },
  ): Promise<ChatResult>;
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

function makeRealClient(): TrueFoundryClient {
  return {
    async chat(messages, opts = {}) {
      const env = getEnv();
      const baseUrl = env.TRUEFOUNDRY_GATEWAY_BASE_URL;
      const apiKey = env.TRUEFOUNDRY_API_KEY;

      if (!baseUrl || !apiKey) {
        throw new Error(
          'TrueFoundry live mode not configured: set TRUEFOUNDRY_GATEWAY_BASE_URL and TRUEFOUNDRY_API_KEY',
        );
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

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '(no body)');
        throw new Error(
          `TrueFoundry chat request failed: ${response.status} ${response.statusText} — ${text}`,
        );
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
        model: string;
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      const text = data.choices[0]?.message?.content ?? '';
      return {
        text,
        model: data.model ?? model,
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

function makeStubClient(): TrueFoundryClient {
  return {
    async chat(messages, opts = {}) {
      const env = getEnv();
      const model = opts.model ?? env.TEXT_MODEL;

      // Derive a deterministic reply from the last user message.
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

      // Truncate to keep the stub output stable and readable.
      const preview =
        lastUserMessage.length > 80 ? `${lastUserMessage.slice(0, 80)}…` : lastUserMessage;

      const text = opts.jsonSchemaName
        ? `{"stub":true,"echo":"${preview.replace(/"/g, "'")}","schema":"${opts.jsonSchemaName}"}`
        : `[stub] Received: "${preview}". This is a deterministic stub response from the TrueFoundry adapter.`;

      return {
        text,
        model,
        usage: {
          promptTokens: 42,
          completionTokens: 24,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getTrueFoundryClient(): TrueFoundryClient {
  return modeFor('truefoundry') === 'live' ? makeRealClient() : makeStubClient();
}
