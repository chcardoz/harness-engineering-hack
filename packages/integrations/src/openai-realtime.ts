import { getEnv, modeFor } from '@yougrep/config';
import { createLogger } from '@yougrep/logger';

const log = createLogger('integrations:realtime');

export interface EphemeralSession {
  clientSecret: string;
  expiresAt: string;
  model: string;
  sessionId: string;
}

export interface RealtimeClient {
  createEphemeralSession(input: {
    sessionId: string;
    instructions: string;
    voice?: string;
  }): Promise<EphemeralSession>;
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

function makeRealClient(): RealtimeClient {
  return {
    async createEphemeralSession({ sessionId, instructions, voice }) {
      const env = getEnv();
      const apiKey = env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('OpenAI Realtime live mode not configured: set OPENAI_API_KEY');
      }

      const model = env.VOICE_MODEL;

      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          instructions,
          voice: voice ?? 'alloy',
          // Pass session_id through as metadata if the API supports it; not a
          // standard field but kept here for forward-compat.
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '(no body)');
        log.error('ephemeral session creation failed', {
          sessionId,
          model,
          status: response.status,
          statusText: response.statusText,
          body: text.slice(0, 500),
        });
        throw new Error(
          `OpenAI Realtime session creation failed: ${response.status} ${response.statusText} — ${text}`,
        );
      }

      const data = (await response.json()) as {
        client_secret?: { value?: string; expires_at?: string };
        id?: string;
        model?: string;
      };

      const clientSecret = data.client_secret?.value;
      if (!clientSecret) {
        log.error('ephemeral session missing client_secret', { sessionId, model });
        throw new Error('OpenAI Realtime: response did not include a client_secret.value');
      }

      log.info('ephemeral session minted', { sessionId: data.id ?? sessionId, model });
      return {
        clientSecret,
        expiresAt: data.client_secret?.expires_at ?? '',
        model: data.model ?? model,
        sessionId: data.id ?? sessionId,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Stub implementation — deterministic, no network
// ---------------------------------------------------------------------------

function makeStubClient(): RealtimeClient {
  return {
    async createEphemeralSession({ sessionId }) {
      const env = getEnv();
      const model = env.VOICE_MODEL;

      // Fixed epoch + 1h offset — no Date.now(), fully deterministic.
      const expiresAt = '1970-01-01T01:00:00.000Z';

      return {
        clientSecret: `ek_stub_${sessionId}`,
        expiresAt,
        model,
        sessionId,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getRealtimeClient(): RealtimeClient {
  return modeFor('openaiRealtime') === 'live' ? makeRealClient() : makeStubClient();
}
