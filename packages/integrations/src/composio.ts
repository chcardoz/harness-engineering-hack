import { Composio } from '@composio/core';
import { getEnv, modeFor } from '@yougrep/config';
import { createLogger } from '@yougrep/logger';
import { AIRBYTE_FIXTURES } from './__fixtures__/airbyte';
import type { ConnectorContextItem } from './airbyte';
import type { ToolDef } from './pioneer';

/**
 * Composio — per-end-user connectors (replaces Airbyte).
 *
 * Unlike Airbyte's builder-owned connectors, Composio scopes every connection
 * to a user id we control. These are ORG-LEVEL connectors (an admin connects
 * the company's GitHub/Notion/Linear once and the whole org's channel agent
 * uses them), so the Composio user id is `org_{organizationId}`.
 *
 * Two things this client provides:
 *  - OAuth lifecycle: `initiateConnection` / `listConnections` for the
 *    "connect your account" flow (needs auth-config ids from the dashboard).
 *  - Agent tools: `getAgentTools` returns OpenAI-shaped tools bound to the
 *    org's connected accounts, ready to drop into the agent tool-loop.
 *
 * Isolation still holds: the CALLER decides which tools an agent sees — the
 * interview agent gets none of these recruiter connectors.
 */

/** Tier-1 toolkits for v1. Values are Composio toolkit slugs. */
export const TOOLKIT_SLUGS = {
  github: 'github',
  notion: 'notion',
  linear: 'linear',
} as const;
export type ComposioToolkit = keyof typeof TOOLKIT_SLUGS;
export const TIER1_TOOLKITS: ComposioToolkit[] = ['github', 'notion', 'linear'];

/** Cap how many tools per request reach the model. */
const MAX_TOOLS = 24;

const log = createLogger('integrations:composio');

const EMPTY_SCHEMA: Record<string, unknown> = { type: 'object', properties: {} };

export interface ComposioConnection {
  id: string;
  toolkit: string;
  status: string;
}

export interface ComposioToolHandle {
  /** OpenAI-style schema advertised to the model. */
  def: ToolDef;
  /** Execute against the org's connected account. */
  execute(args: Record<string, unknown>): Promise<string>;
}

export interface ComposioClient {
  /** Begin an OAuth connection for a toolkit; returns the URL to send the user to. */
  initiateConnection(input: {
    userId: string;
    toolkit: ComposioToolkit;
    callbackUrl: string;
  }): Promise<{ redirectUrl: string; connectionId: string }>;

  /** List a user's connected accounts (optionally filtered by toolkit). */
  listConnections(
    userId: string,
    toolkits?: ComposioToolkit[],
  ): Promise<ComposioConnection[]>;

  /** Tools bound to the user's connected accounts, for the agent loop. */
  getAgentTools(input: {
    userId: string;
    toolkits?: ComposioToolkit[];
  }): Promise<ComposioToolHandle[]>;

  /**
   * Read-only context for brief distillation. Stub returns fixtures; live mode
   * returns [] for now — real connector context flows through `getAgentTools`
   * in-channel, and live brief pre-fetch is a follow-up.
   */
  readContext(input: {
    provider: string;
    organizationId: string;
    query?: string;
  }): Promise<{ provider: string; items: ConnectorContextItem[] }>;
}

/** The Composio user id for an organization's shared connectors. */
export function composioUserId(organizationId: string): string {
  return `org_${organizationId}`;
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

function authConfigId(toolkit: ComposioToolkit): string {
  const raw = getEnv().COMPOSIO_AUTH_CONFIGS_JSON;
  if (!raw) {
    throw new Error(
      'Composio live mode not configured: set COMPOSIO_AUTH_CONFIGS_JSON to a ' +
        'JSON map of toolkit → auth-config id (from the Composio dashboard).',
    );
  }
  let map: Record<string, string>;
  try {
    map = JSON.parse(raw) as Record<string, string>;
  } catch {
    throw new Error('COMPOSIO_AUTH_CONFIGS_JSON is not valid JSON');
  }
  const id = map[toolkit];
  if (!id) {
    throw new Error(`No Composio auth-config id for toolkit "${toolkit}"`);
  }
  return id;
}

let composioSingleton: Composio | null = null;
function getComposio(): Composio {
  if (!composioSingleton) {
    const apiKey = getEnv().COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('Composio live mode not configured: set COMPOSIO_API_KEY');
    }
    composioSingleton = new Composio({ apiKey });
  }
  return composioSingleton;
}

function makeRealClient(): ComposioClient {
  return {
    async initiateConnection({ userId, toolkit, callbackUrl }) {
      const composio = getComposio();
      log.info('initiate connection', { userId, toolkit });
      try {
        const req = await composio.connectedAccounts.initiate(
          userId,
          authConfigId(toolkit),
          { callbackUrl },
        );
        if (!req.redirectUrl) {
          throw new Error(
            `Composio did not return a redirect URL for toolkit "${toolkit}"`,
          );
        }
        log.info('initiate connection ok', { userId, toolkit, connectionId: req.id });
        return { redirectUrl: req.redirectUrl, connectionId: req.id };
      } catch (err) {
        log.error('initiate connection failed', { userId, toolkit, err });
        throw err;
      }
    },

    async listConnections(userId, toolkits) {
      const composio = getComposio();
      const res = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: toolkits?.map((t) => TOOLKIT_SLUGS[t]),
      });
      return res.items.map((a) => ({
        id: a.id,
        toolkit: a.toolkit.slug,
        status: a.status,
      }));
    },

    async getAgentTools({ userId, toolkits }) {
      const composio = getComposio();
      const slugs = (toolkits ?? TIER1_TOOLKITS).map((t) => TOOLKIT_SLUGS[t]);
      const raw = await composio.tools.getRawComposioTools({
        toolkits: slugs,
        important: true,
        limit: MAX_TOOLS,
      });
      log.debug('loaded agent tools', { userId, toolkits: slugs, count: raw.length });

      return raw.map((tool) => ({
        def: {
          type: 'function' as const,
          function: {
            name: tool.slug,
            description: (tool.description ?? tool.name).slice(0, 1024),
            parameters:
              (tool.inputParameters as Record<string, unknown> | undefined) ??
              EMPTY_SCHEMA,
          },
        },
        execute: async (args: Record<string, unknown>) => {
          const startedAt = Date.now();
          try {
            const res = await composio.tools.execute(tool.slug, {
              userId,
              arguments: args,
            });
            if (!res.successful) {
              log.warn('tool execution unsuccessful', {
                tool: tool.slug,
                userId,
                error: res.error,
                ms: Date.now() - startedAt,
              });
              return JSON.stringify({ error: res.error ?? 'tool execution failed' });
            }
            log.debug('tool executed', { tool: tool.slug, userId, ms: Date.now() - startedAt });
            return JSON.stringify(res.data ?? {});
          } catch (err) {
            log.error('tool execution threw', { tool: tool.slug, userId, err });
            return JSON.stringify({ error: (err as Error).message });
          }
        },
      }));
    },

    async readContext({ provider }) {
      // Live brief pre-fetch is a follow-up; real context flows via agent tools.
      return { provider, items: [] };
    },
  };
}

// ---------------------------------------------------------------------------
// Stub implementation — deterministic, no network
// ---------------------------------------------------------------------------

function makeStubClient(): ComposioClient {
  return {
    async initiateConnection({ userId, toolkit }) {
      return {
        redirectUrl: `https://stub.composio.local/connect/${toolkit}?user=${encodeURIComponent(userId)}`,
        connectionId: `stub_conn_${toolkit}`,
      };
    },

    async listConnections(_userId, toolkits) {
      return (toolkits ?? TIER1_TOOLKITS).map((t) => ({
        id: `stub_conn_${t}`,
        toolkit: TOOLKIT_SLUGS[t],
        status: 'ACTIVE',
      }));
    },

    async getAgentTools({ toolkits }) {
      // A deterministic read tool per toolkit so the loop runs offline.
      return (toolkits ?? TIER1_TOOLKITS).map((t) => ({
        def: {
          type: 'function' as const,
          function: {
            name: `${TOOLKIT_SLUGS[t]}_search`,
            description: `Search ${t} for context (stub).`,
            parameters: {
              type: 'object',
              properties: { query: { type: 'string' } },
            },
          },
        },
        execute: async (args: Record<string, unknown>) =>
          JSON.stringify({
            stub: true,
            toolkit: TOOLKIT_SLUGS[t],
            query: args['query'] ?? '',
            results: AIRBYTE_FIXTURES[TOOLKIT_SLUGS[t]] ?? [],
          }),
      }));
    },

    async readContext({ provider }) {
      return { provider, items: AIRBYTE_FIXTURES[provider] ?? [] };
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getComposioClient(): ComposioClient {
  return modeFor('composio') === 'live' ? makeRealClient() : makeStubClient();
}
