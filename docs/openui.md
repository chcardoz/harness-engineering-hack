# OpenUI

## What It Is

OpenUI most likely refers to Thesys OpenUI, a full-stack generative UI framework for AI apps. It lets an LLM emit a constrained UI description in `openui-lang`, then renders that output into real React UI using a predefined component library.

This is different from W&B's older `wandb/openui`, which is more of a UI prototyping/code-generation project.

Official sources:

- Product/docs: https://www.openui.com/docs/openui-lang
- GitHub: https://github.com/thesysdev/openui
- LangChain integration docs: https://docs.langchain.com/oss/python/langchain/frontend/integrations/openui

## Relevant Capabilities

- Compact streaming-first `openui-lang` DSL.
- React runtime and renderer.
- Ready-made chat UI packages.
- Component definitions with schemas and descriptions.
- Generated system prompts that teach the LLM which components are available.
- Streaming rendering of assistant output into forms, cards, charts, tables, tabs, dashboards, and action UIs.
- Query/mutation/action hooks for tool-connected interactive UI.
- Safer rendering model than arbitrary generated code because the model selects from predefined components.

Key docs:

- Quick start: https://www.openui.com/docs/openui-lang/quickstart
- Defining components: https://www.openui.com/docs/openui-lang/defining-components
- System prompts: https://www.openui.com/docs/openui-lang/system-prompts
- Renderer: https://www.openui.com/docs/openui-lang/renderer
- Interactivity: https://www.openui.com/docs/openui-lang/interactivity
- Queries and mutations: https://www.openui.com/docs/openui-lang/queries-mutations
- v0.5 spec: https://www.openui.com/docs/openui-lang/specification-v05

## Fit For Yougrep MVP

OpenUI is a strong fit for the in-product Slack-like recruiter UI and candidate interview surface.

Company-side UI components:

- `JobBriefCard`
- `ConnectorStatus`
- `JobListingDraft`
- `CandidateCard`
- `CandidateComparisonTable`
- `PipelineChart`
- `InterviewSummary`
- `NextActionButtons`
- `GreenhousePostConfirm`

Candidate-side interview components:

- `QuestionCard`
- `SkillSelfRating`
- `SQLProblemEditor`
- `ArchitecturePrompt`
- `TimedExercise`
- `RubricProgress`
- `ConsentNotice`
- `InterviewComplete`

OpenUI should render inside the Yougrep web app's chat/interview surfaces. It should not be treated as a native Slack renderer.

## Slack Clarification

OpenUI renders React UI in your app. Slack messages use Slack Block Kit JSON with strict native elements and limits. If Yougrep later posts into actual Slack, use one of these patterns:

- send text summaries plus a link back to the OpenUI-rendered Yougrep thread.
- translate a small subset of OpenUI components into Slack Block Kit.
- keep rich interactive UI only in Yougrep.

Slack Block Kit docs: https://docs.slack.dev/block-kit/

## Integration Shape

1. Define a narrow recruiter component library.
2. Generate or include the OpenUI system prompt for that library.
3. Ask the model to respond in `openui-lang` for UI-bearing messages.
4. Render assistant messages with OpenUI's React renderer inside the chat timeline.
5. Keep all sensitive actions behind backend tools and permission checks.
6. Require explicit confirmation before mutations such as posting a job, sending outreach, rejecting a candidate, or creating an ATS record.

## Risks And Caveats

- OpenUI packages are still early/`0.x`, so API churn is likely.
- LLM output can be invalid. The renderer can expose errors, but the app needs retry/correction behavior.
- Too many components will bloat prompts and confuse model selection. Keep the MVP library small.
- OpenUI constrains UI rendering, but it does not secure tool execution. Backend authorization and audit logs are still required.
- Candidate-facing generated UI needs accessibility, fallback text, and a non-voice path.

## MVP Recommendation

Use OpenUI in the owned web app, not in real Slack. Start with a minimal component library for job draft review, candidate cards, interview questions, and score summaries.
