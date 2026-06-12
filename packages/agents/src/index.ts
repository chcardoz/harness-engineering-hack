// Public contract
export type {
  JobChannelIntent,
  JobChannelInput,
  AgentTurn,
  InterviewStepResult,
  PlannedQuestion,
  RubricCriterion,
  InterviewPlanDraft,
} from './types';

// Job-channel (recruiter) agent
export { runJobChannelAgent } from './job-channel-agent';
export { classifyIntent } from './intent';

// Interview (candidate) agent — isolated
export {
  startInterviewSession,
  submitInterviewAnswer,
  finalizeInterviewResult,
} from './interview-agent';

// Connector context + brief distillation
export {
  gatherConnectorContext,
  distillJobBrief,
  type ConnectorContext,
  type DistilledBrief,
} from './connector-context';

// Interview plan authoring
export { buildInterviewPlanDraft, criterionLabel } from './rubric';
export { scoreAnswer, type AnswerScore } from './scoring';

// Prompts (personas)
export { JOB_CHANNEL_SYSTEM_PROMPT, INTERVIEW_SYSTEM_PROMPT } from './prompts';
