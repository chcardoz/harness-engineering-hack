# TrueFoundry

## What It Is

TrueFoundry is the LLM gateway for Yougrep's non-realtime model calls. The AI Gateway sits between Guild-managed agents and the underlying model providers.

Official docs: https://www.truefoundry.com/docs/platform/overview

## Relevant Capabilities

- Unified AI Gateway for 1000+ LLMs.
- Proxy layer between apps and LLM providers, MCP servers, and agents.
- Access control, key management, governance, monitoring, rate limits, budget limits, audit, and guardrails.
- OpenAI-compatible usage through a gateway base URL and API key.
- Prompt management, tracing/observability, MCP registry/gateway, and agent-related endpoints.
- Deployment support for services, agents, workflows, and model serving on infrastructure.

Sources:

- Platform overview: https://www.truefoundry.com/docs/platform/overview
- AI Gateway introduction: https://www.truefoundry.com/docs/ai-gateway/intro-to-llm-gateway
- Quick start and OpenAI SDK usage: https://www.truefoundry.com/docs/ai-gateway/quick-start
- Realtime API routing: https://www.truefoundry.com/docs/ai-gateway/realtime-api
- Gateway deployment: https://www.truefoundry.com/docs/platform/deploy-control-plane-and-gateway-plane

## Fit For Yougrep MVP

Best fit:

- Use TrueFoundry as the LLM gateway for recruiter chat, job listing generation, interview question generation, candidate summarization, and ranking.
- Keep provider keys outside the app and route model calls through the gateway.
- Capture LLM latency, cost, model, and error data through gateway observability.
- Use provider/model routing to switch between cheaper models for routine summarization and stronger models for final candidate evaluation.
- Let Guild own the agent runtime and call TrueFoundry for the actual model invocation.

Less important for the first MVP:

- Full TrueFoundry deployment platform if Render is already the deployment target.
- Complex enterprise governance unless the demo requires admin controls, budgets, and approval gates.

## Integration Shape

The application can use the normal OpenAI SDK style:

- `OPENAI_BASE_URL` points to the TrueFoundry gateway URL.
- `OPENAI_API_KEY` is the TrueFoundry token.
- model IDs are the gateway model IDs configured in TrueFoundry.

This keeps the app model-provider-agnostic while preserving normal SDK ergonomics. The browser should not call TrueFoundry directly; calls should originate from the backend/Guild runtime.

## Risks And Caveats

- It may be heavier than direct OpenAI calls if the MVP only calls one model provider, but in this stack it provides the intended gateway/observability layer.
- It does not replace a voice stack. It can broker LLM calls, but realtime voice still needs STT/TTS/realtime audio orchestration. As of June 2026 the AI Gateway does explicitly support OpenAI Realtime routing and native WebSocket passthrough for voice providers (e.g. Cartesia Sonic/Ink, Resemble AI); note that voice/audio is bridged via native WebSocket passthrough (HTTP Upgrade handshake) rather than the OpenAI-compatible schema translation used for text, so it is not a drop-in text-style integration.
- It overlaps somewhat with Guild on governance/observability. The split should be: TrueFoundry for model gateway/provider routing; Guild for agent/tool access governance if both are used.

## MVP Recommendation

Use TrueFoundry as the LLM gateway. Keep Render as the app host and Guild as the agent control plane.
