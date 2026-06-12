/**
 * Contract tests for @yougrep/integrations stub clients.
 *
 * These tests run in stub mode (no env vars needed) and assert that each
 * client getter returns responses that match the documented interface shapes.
 * They do NOT hit any network or require API keys.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';

// Force stub mode for every service before any module is imported.
beforeAll(() => {
  process.env['INTEGRATIONS_MODE'] = 'stub';
  // Clear any per-service overrides that might leak in from the environment.
  delete process.env['GUILD_MODE'];
  delete process.env['TRUEFOUNDRY_MODE'];
  delete process.env['AIRBYTE_MODE'];
  delete process.env['OPENAI_REALTIME_MODE'];
});

// ---------------------------------------------------------------------------
// Zod schemas mirroring the exported interface shapes
// ---------------------------------------------------------------------------

const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const ChatResultSchema = z.object({
  text: z.string(),
  model: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
  }),
});

const ConnectorContextItemSchema = z.object({
  title: z.string(),
  snippet: z.string(),
  url: z.string().optional(),
  source: z.string(),
});

const AirbyteReadResultSchema = z.object({
  provider: z.string(),
  items: z.array(ConnectorContextItemSchema),
});

const GuildRunResultSchema = z.object({
  guildRunId: z.string().uuid(),
  traceId: z.string().uuid(),
  latencyMs: z.number().nonnegative(),
  result: z.unknown(),
});

const EphemeralSessionSchema = z.object({
  clientSecret: z.string().min(1),
  expiresAt: z.string().min(1),
  model: z.string().min(1),
  sessionId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// TrueFoundry
// ---------------------------------------------------------------------------

describe('TrueFoundryClient (stub)', () => {
  it('returns a ChatResult for a basic user message', async () => {
    // Dynamic import so beforeAll env setup is applied first.
    const { getTrueFoundryClient } = await import('../truefoundry');
    const client = getTrueFoundryClient();

    const messages = [
      { role: 'system' as const, content: 'You are a recruiter assistant.' },
      { role: 'user' as const, content: 'Summarise this candidate.' },
    ];

    const result = await client.chat(messages);
    const parsed = ChatResultSchema.safeParse(result);

    expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error)}`).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.model).toBeTruthy();
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
  });

  it('is deterministic — same input produces same output', async () => {
    const { getTrueFoundryClient } = await import('../truefoundry');
    const client = getTrueFoundryClient();
    const messages = [{ role: 'user' as const, content: 'Hello world' }];

    const r1 = await client.chat(messages);
    const r2 = await client.chat(messages);

    expect(r1.text).toBe(r2.text);
    expect(r1.usage.promptTokens).toBe(r2.usage.promptTokens);
    expect(r1.usage.completionTokens).toBe(r2.usage.completionTokens);
  });

  it('accepts optional model and temperature opts', async () => {
    const { getTrueFoundryClient } = await import('../truefoundry');
    const client = getTrueFoundryClient();

    const result = await client.chat(
      [{ role: 'user' as const, content: 'Generate a job description.' }],
      { model: 'gpt-4o-mini', temperature: 0.2 },
    );

    expect(result.model).toBe('gpt-4o-mini');
  });

  it('returns JSON-looking text when jsonSchemaName is provided', async () => {
    const { getTrueFoundryClient } = await import('../truefoundry');
    const client = getTrueFoundryClient();

    const result = await client.chat(
      [{ role: 'user' as const, content: 'Extract candidate info.' }],
      { jsonSchemaName: 'CandidateProfile' },
    );

    // Stub encodes the schema name in the response.
    expect(result.text).toContain('CandidateProfile');
  });

  it('validates ChatMessage shape with zod', () => {
    const valid: unknown = { role: 'user', content: 'hello' };
    const parsed = ChatMessageSchema.safeParse(valid);
    expect(parsed.success).toBe(true);

    const invalid: unknown = { role: 'robot', content: 'hello' };
    expect(ChatMessageSchema.safeParse(invalid).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Airbyte
// ---------------------------------------------------------------------------

describe('AirbyteClient (stub)', () => {
  it('returns ConnectorContextItems for known providers', async () => {
    const { getAirbyteClient } = await import('../airbyte');
    const client = getAirbyteClient();

    for (const provider of ['notion', 'github', 'slack', 'greenhouse', 'ashby'] as const) {
      const result = await client.readContext({
        provider,
        organizationId: 'org-acme',
      });

      const parsed = AirbyteReadResultSchema.safeParse(result);
      expect(
        parsed.success,
        `Schema mismatch for ${provider}: ${JSON.stringify(parsed.error)}`,
      ).toBe(true);
      expect(result.provider).toBe(provider);
      expect(result.items.length).toBeGreaterThan(0);

      for (const item of result.items) {
        expect(item.source).toBe(provider);
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.snippet.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns empty items for an unknown provider', async () => {
    const { getAirbyteClient } = await import('../airbyte');
    const client = getAirbyteClient();

    const result = await client.readContext({
      provider: 'unknown-provider',
      organizationId: 'org-acme',
    });

    expect(result.provider).toBe('unknown-provider');
    expect(result.items).toEqual([]);
  });

  it('is deterministic — same provider returns same items', async () => {
    const { getAirbyteClient } = await import('../airbyte');
    const client = getAirbyteClient();

    const r1 = await client.readContext({ provider: 'notion', organizationId: 'org-a' });
    const r2 = await client.readContext({ provider: 'notion', organizationId: 'org-b' });

    expect(r1.items).toEqual(r2.items);
  });
});

// ---------------------------------------------------------------------------
// Guild
// ---------------------------------------------------------------------------

describe('GuildClient (stub)', () => {
  it('wraps an async exec and returns GuildRunResult shape', async () => {
    const { getGuildClient } = await import('../guild');
    const client = getGuildClient();

    const meta = { agentType: 'job-channel' as const, organizationId: 'org-acme' };
    const expectedResult = { answer: 42 };

    const runResult = await client.run(meta, async () => expectedResult);

    const parsed = GuildRunResultSchema.safeParse(runResult);
    expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error)}`).toBe(true);

    expect(runResult.result).toEqual(expectedResult);
    expect(runResult.latencyMs).toBeGreaterThanOrEqual(0);
    expect(runResult.guildRunId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(runResult.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('propagates errors thrown by exec', async () => {
    const { getGuildClient } = await import('../guild');
    const client = getGuildClient();

    const meta = { agentType: 'interview' as const, organizationId: 'org-test' };

    await expect(
      client.run(meta, async () => {
        throw new Error('exec failure');
      }),
    ).rejects.toThrow('exec failure');
  });

  it('generates unique run IDs on each call', async () => {
    const { getGuildClient } = await import('../guild');
    const client = getGuildClient();

    const meta = { agentType: 'job-channel' as const, organizationId: 'org-unique' };
    const r1 = await client.run(meta, async () => null);
    const r2 = await client.run(meta, async () => null);

    expect(r1.guildRunId).not.toBe(r2.guildRunId);
    expect(r1.traceId).not.toBe(r2.traceId);
  });

  it('supports generic result types', async () => {
    const { getGuildClient } = await import('../guild');
    const client = getGuildClient();

    const meta = { agentType: 'job-channel' as const, organizationId: 'org-types' };

    const stringResult = await client.run<string>(meta, async () => 'hello');
    expect(typeof stringResult.result).toBe('string');

    const numResult = await client.run<number>(meta, async () => 99);
    expect(numResult.result).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// OpenAI Realtime
// ---------------------------------------------------------------------------

describe('RealtimeClient (stub)', () => {
  it('mints a deterministic ephemeral session', async () => {
    const { getRealtimeClient } = await import('../openai-realtime');
    const client = getRealtimeClient();

    const session = await client.createEphemeralSession({
      sessionId: 'sess-abc123',
      instructions: 'You are an interview agent for a Senior Postgres Engineer role.',
    });

    const parsed = EphemeralSessionSchema.safeParse(session);
    expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error)}`).toBe(true);

    expect(session.clientSecret).toBe('ek_stub_sess-abc123');
    expect(session.sessionId).toBe('sess-abc123');
    expect(session.expiresAt).toBe('1970-01-01T01:00:00.000Z');
    expect(session.model).toBeTruthy();
  });

  it('is deterministic — same sessionId returns same secret', async () => {
    const { getRealtimeClient } = await import('../openai-realtime');
    const client = getRealtimeClient();

    const input = {
      sessionId: 'sess-deterministic',
      instructions: 'Interview instructions',
    };

    const s1 = await client.createEphemeralSession(input);
    const s2 = await client.createEphemeralSession(input);

    expect(s1.clientSecret).toBe(s2.clientSecret);
    expect(s1.expiresAt).toBe(s2.expiresAt);
  });

  it('embeds the sessionId in clientSecret', async () => {
    const { getRealtimeClient } = await import('../openai-realtime');
    const client = getRealtimeClient();

    const sessionId = 'unique-session-xyz';
    const session = await client.createEphemeralSession({
      sessionId,
      instructions: 'Test',
    });

    expect(session.clientSecret).toContain(sessionId);
  });

  it('accepts an optional voice parameter', async () => {
    const { getRealtimeClient } = await import('../openai-realtime');
    const client = getRealtimeClient();

    // Stub ignores voice but must not throw.
    await expect(
      client.createEphemeralSession({
        sessionId: 'sess-voice',
        instructions: 'Test voice param',
        voice: 'shimmer',
      }),
    ).resolves.toBeDefined();
  });
});
