# Voice Model Providers

## Selected Provider

Use GPT Realtime 2 through the OpenAI Realtime API for the Yougrep candidate interview.

## Ranking For Yougrep

This ranking is for a live candidate interview inside the Yougrep web app, not generic call-center automation. The key requirements are low latency, natural speech, barge-in/interruption handling, transcripts, tool calling, controllable interview behavior, and clean integration with the existing web app plus OpenUI.

## Top 5

### 1. OpenAI Realtime API: selected

Best default if the interview agent needs real reasoning, tool use, and tight app integration.

Why it stands out:

- Native low-latency speech-to-speech path through `gpt-realtime-2`.
- Voice-agent sessions can respond, call tools, manage conversation state, and stream session events.
- Browser/mobile audio should use WebRTC; server audio pipelines can use WebSockets.
- Agents SDK path supports tools, interruptions, handoffs, and guardrails in the same model flow as text agents.
- Strong fit with the rest of the app if the core recruiter/interview intelligence is already OpenAI-style agents.

Sources:

- Realtime and audio overview: https://developers.openai.com/api/docs/guides/realtime
- Voice agents guide: https://developers.openai.com/api/docs/guides/voice-agents
- WebRTC transport: https://developers.openai.com/api/docs/guides/realtime-webrtc

Best use in Yougrep:

- Candidate web interview.
- Voice plus tool calls into the Yougrep backend.
- Live transcript and rubric extraction.
- Keeping business logic in the agent/backend rather than in a third-party voice workflow builder.

Watch-outs:

- You own more of the app/session design than with a packaged phone-agent product.
- Cost and latency need real testing with interview-length sessions.
- For hiring, do not let the voice model directly make final candidate judgments without human review.

### 2. ElevenLabs ElevenAgents

Best if the highest priority is a polished, human-sounding candidate experience.

Why it stands out:

- ElevenLabs has a very strong voice-quality reputation and broad voice library.
- ElevenAgents coordinates ASR, LLM choice, low-latency TTS, and turn-taking.
- Supports web, mobile, server, telephony, Twilio, SIP, batch calls, real-time events, testing, analytics, conversation analysis, and OpenTelemetry traces.
- Docs list 5k+ voices and broad language support for voice/language configuration.
- Built-in tooling around evals, monitoring, conversation history, and retention is useful for interview QA.

Sources:

- ElevenAgents overview: https://elevenlabs.io/docs/eleven-agents/overview
- ElevenAgents quickstart: https://elevenlabs.io/docs/eleven-agents/quickstart
- ElevenLabs API overview: https://elevenlabs.io/docs/overview/intro

Best use in Yougrep:

- Candidate-facing interview where perceived quality matters.
- Fast demo of a premium voice interviewer.
- Later phone/SIP/WhatsApp interview channels.

Watch-outs:

- More platform surface area than a raw model API.
- If you want exact control over every agent turn and every UI event, validate the WebSocket/events layer early.
- Use retention/privacy settings carefully for interview recordings.

### 3. Deepgram Voice Agent API

Best pragmatic full-pipeline voice stack for developers who want one WebSocket and strong speech infrastructure.

Why it stands out:

- Voice Agent API handles listening, thinking, and speaking over a single WebSocket.
- Lets you configure STT models, LLM providers, TTS voices, endpointing, audio formats, and functions.
- Supports function calling, multi-agent architecture, telephony, browser SDK/UI components, barge-in, audio preprocessing, and echo cancellation.
- Deepgram is especially credible on speech-to-text and realtime speech infrastructure.

Sources:

- Voice Agent getting started: https://developers.deepgram.com/docs/voice-agent
- Configure Voice Agent: https://developers.deepgram.com/docs/configure-voice-agent

Best use in Yougrep:

- A reliable hosted voice pipeline where Yougrep still controls LLM prompts/tools.
- Multimodal recruiter interview with backend function calls.
- Teams that want strong STT plus a managed voice loop without assembling every piece.

Watch-outs:

- If OpenAI is already the main intelligence layer, compare direct OpenAI Realtime against Deepgram's managed pipeline before committing.
- Confirm how transcripts, recordings, and model-improvement settings are stored for candidate privacy.

### 4. Hume EVI

Most impressive for emotionally aware, natural conversation, but needs extra caution in hiring.

Why it stands out:

- Hume's EVI is a realtime speech-to-speech interface focused on emotional intelligence.
- It measures prosody and uses vocal expression to guide timing, tone, and response.
- Supports interruption, natural end-of-turn detection, WebSocket sessions, voice library/voice design, and multilingual support.
- This could make the interview feel less robotic and more conversational.

Sources:

- Hume API intro: https://dev.hume.ai/intro
- EVI overview: https://dev.hume.ai/docs/speech-to-speech-evi/overview

Best use in Yougrep:

- Candidate interview experience where empathy, pacing, and turn-taking are important.
- Practice interviews, coaching, or candidate support flows.

Watch-outs:

- Do not use emotion/prosody signals for hiring scores without serious legal, fairness, and consent review.
- Emotional AI can be sensitive and potentially manipulative; for hiring, keep evaluation grounded in job-relevant answers and work samples.
- It is impressive, but not the safest first production choice for candidate assessment.

### 5. Cartesia

Best model-layer choice if Yougrep wants to assemble its own voice stack with very fast TTS/STT.

Why it stands out:

- Cartesia provides Sonic text-to-speech and Ink speech-to-text for realtime voice experiences.
- Docs describe Sonic 3.5 as low-latency, with first audio byte around 90ms.
- Ink 2 is positioned for realtime voice-agent transcription with native turn detection.
- Strong fit if the app uses a separate LLM gateway such as TrueFoundry and wants a premium speech layer.

Sources:

- Cartesia overview: https://docs.cartesia.ai/get-started/overview
- Sonic: https://cartesia.ai/sonic/

Best use in Yougrep:

- Custom voice stack: Cartesia STT/TTS + TrueFoundry/OpenAI LLM + Yougrep backend tools.
- High-quality voice output where you do not want the voice provider to own the whole agent workflow.

Watch-outs:

- More integration work than ElevenLabs/Deepgram/OpenAI Realtime if using it mainly as STT/TTS.
- Validate its agent product surface separately if choosing Cartesia as the full voice-agent platform, not just model APIs.

## Honorable Mentions

### Retell AI

Very strong for phone agents. It is a platform to build, test, deploy, and monitor inbound/outbound AI phone agents with telephony, prompts, tools, and analytics. It may be excellent later for phone-screening automation, but for Yougrep's first browser-based candidate interview, OpenAI/ElevenLabs/Deepgram are cleaner primary picks.

Source: https://docs.retellai.com/general/introduction

### Vapi

Great voice-agent orchestration platform with many provider integrations. It is useful if you want to mix and match STT, LLM, and TTS providers quickly. It is less a single voice model provider and more an orchestration layer.

Source: https://docs.vapi.ai/quickstart/introduction

### AssemblyAI Voice Agent API

Interesting new all-in-one option with a single WebSocket and simple hourly pricing. It is worth testing if pricing simplicity matters, but I would not put it above the top five for a premium candidate interview yet.

Source: https://www.assemblyai.com/solutions/voice-agents

## Recommendation

For Yougrep, the selected path is:

1. Build the text interview first.
2. Add GPT Realtime 2 over WebRTC for candidate voice interviews.
3. Keep ElevenLabs as the fallback/prototype if voice polish becomes more important than direct agent control.

If GPT Realtime 2 feels too heavy or expensive, test Deepgram next as the pragmatic full-pipeline alternative. Keep Hume as a differentiated candidate-experience experiment, not as the scoring engine. Use Cartesia if you decide to build your own voice pipeline around a separate LLM gateway.
