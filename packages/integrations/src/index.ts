// Pioneer — LLM gateway (text completions + tool calling)
export type {
  ChatMessage,
  ChatResult,
  ChatOptions,
  ToolCall,
  ToolDef,
  PioneerClient,
} from './pioneer';
export { getPioneerClient, probeToolCalling } from './pioneer';

// TrueFoundry — legacy LLM gateway, retained until removed in the docs/sweep step.
export { getTrueFoundryClient } from './truefoundry';

// Composio — per-end-user connectors (GitHub/Notion/Linear)
export type {
  ComposioClient,
  ComposioToolkit,
  ComposioToolHandle,
  ComposioConnection,
} from './composio';
export {
  getComposioClient,
  composioUserId,
  TOOLKIT_SLUGS,
  TIER1_TOOLKITS,
} from './composio';

// Airbyte — legacy read-only connectors, retained until removed in the docs/sweep step.
export type { ConnectorContextItem, AirbyteClient } from './airbyte';
export { getAirbyteClient } from './airbyte';

// Guild — agent control plane
export type { GuildRunMeta, GuildRunResult, GuildClient } from './guild';
export { getGuildClient } from './guild';

// OpenAI Realtime — voice session credential minting
export type { EphemeralSession, RealtimeClient } from './openai-realtime';
export { getRealtimeClient } from './openai-realtime';
