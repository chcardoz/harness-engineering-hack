import { getEnv, modeFor } from '@yougrep/config';
import { AIRBYTE_FIXTURES } from './__fixtures__/airbyte';

export interface ConnectorContextItem {
  title: string;
  snippet: string;
  url?: string;
  source: string;
}

export interface AirbyteClient {
  readContext(input: {
    provider: string;
    organizationId: string;
    query?: string;
  }): Promise<{ provider: string; items: ConnectorContextItem[] }>;
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

function makeRealClient(): AirbyteClient {
  return {
    async readContext({ provider, organizationId, query }) {
      const env = getEnv();
      const apiKey = env.AIRBYTE_API_KEY;
      const workspaceId = env.AIRBYTE_WORKSPACE_ID;
      const connectorIdsJson = env.AIRBYTE_CONNECTOR_IDS_JSON;

      if (!apiKey || !workspaceId) {
        throw new Error(
          'Airbyte live mode not configured: set AIRBYTE_API_KEY and AIRBYTE_WORKSPACE_ID',
        );
      }

      // Resolve the connector ID for this provider from the JSON map, if supplied.
      let connectorId: string | undefined;
      if (connectorIdsJson) {
        try {
          const idMap = JSON.parse(connectorIdsJson) as Record<string, string>;
          connectorId = idMap[provider];
        } catch {
          // fall through — connectorId stays undefined
        }
      }

      if (!connectorId) {
        throw new Error(
          `Airbyte live mode not configured: no connector ID for provider "${provider}". ` +
            'Set AIRBYTE_CONNECTOR_IDS_JSON to a JSON map of provider → connector ID.',
        );
      }

      // Airbyte Agents API: POST /v1/agent-connectors/{connectorId}/read
      const url = `https://api.airbyte.com/v1/agent-connectors/${connectorId}/read`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          organization_id: organizationId,
          query: query ?? '',
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '(no body)');
        throw new Error(
          `Airbyte readContext failed for provider "${provider}": ` +
            `${response.status} ${response.statusText} — ${text}`,
        );
      }

      const data = (await response.json()) as {
        records?: Array<{ title?: string; snippet?: string; url?: string }>;
      };

      const items: ConnectorContextItem[] = (data.records ?? []).map((r) => ({
        title: r.title ?? '(untitled)',
        snippet: r.snippet ?? '',
        url: r.url,
        source: provider,
      }));

      return { provider, items };
    },
  };
}

// ---------------------------------------------------------------------------
// Stub implementation — deterministic fixtures, no network
// ---------------------------------------------------------------------------

function makeStubClient(): AirbyteClient {
  return {
    async readContext({ provider }) {
      const items: ConnectorContextItem[] = AIRBYTE_FIXTURES[provider] ?? [];
      return { provider, items };
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getAirbyteClient(): AirbyteClient {
  return modeFor('airbyte') === 'live' ? makeRealClient() : makeStubClient();
}
