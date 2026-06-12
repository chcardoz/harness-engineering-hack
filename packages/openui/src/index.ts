// Types and contract (zod schemas, validateNode, doc/node helpers, all type exports)
export * from './types';

// Action context (also re-exported from renderers for convenience)
export { OpenUIActionContext } from './context';

// Renderer
export { OpenUIRenderer, OpenUIFallback } from './renderers';
export type { OpenUIRendererProps } from './renderers';

// Recruiter component library + registry
export { recruiterRegistry } from './recruiter-library';
export {
  JobBriefCard,
  ConnectorStatus,
  JobListingDraft,
  CandidateCard,
  CandidateComparisonTable,
  InterviewSummary,
  PipelineChart,
  NextActionButtons,
  ConfirmPublish,
} from './recruiter-library';

// Interview component library + registry
export { interviewRegistry } from './interview-library';
export {
  QuestionCard,
  SkillSelfRating,
  SQLProblemEditor,
  ArchitecturePrompt,
  TimedExercise,
  RubricProgress,
  ConsentNotice,
  InterviewComplete,
} from './interview-library';

// Fixtures for visual QA and testing
export {
  JOB_LISTING_DRAFT,
  CANDIDATE_CARD,
  CANDIDATE_COMPARISON_TABLE,
  QUESTION_CARD,
  SQL_PROBLEM_EDITOR,
  INTERVIEW_COMPLETE,
  MALFORMED_DOCUMENT,
} from './fixtures';
