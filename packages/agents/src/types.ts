import type { OpenUIDocument, OpenUIAction } from '@yougrep/openui';

/**
 * Public contract for the Yougrep agents package.
 *
 * Two long-running agents live here:
 *  - the **job-channel agent** (recruiter side): sees the recruiter thread,
 *    connector context, listings, candidates, and result packages.
 *  - the **interview agent** (candidate side): isolated — sees ONLY the
 *    persisted interview plan (distilled brief + rubric + question plan) and
 *    the live interview session. It never reads the recruiter thread or raw
 *    connector data.
 *
 * Both produce OpenUI documents (predefined components only) and persist a
 * trace row in `agent_runs` via the Guild control-plane wrapper.
 */

/* ── Job-channel agent ───────────────────────────────────────────────────── */

/** What the recruiter is asking the channel agent to do. */
export type JobChannelIntent =
  | 'overview'
  | 'draft_listing'
  | 'review_candidates'
  | 'compare_candidates'
  | 'build_interview'
  | 'publish'
  | 'help';

export interface JobChannelInput {
  organizationId: string;
  jobChannelId: string;
  /** Recruiter who triggered the turn (for audit + message attribution). */
  userId?: string;
  /** Free-text recruiter message. */
  message: string;
  /**
   * An OpenUI action the recruiter took (e.g. pressed a NextActionButtons
   * button or confirmed a publish). Drives confirmable mutations.
   */
  action?: OpenUIAction;
}

export interface AgentTurn {
  /** Persisted assistant message id. */
  messageId: string;
  /** agent_runs trace id. */
  agentRunId: string;
  /** Conversational reply text. */
  text: string;
  /** OpenUI payload attached to the reply, or null for a plain message. */
  openui: OpenUIDocument | null;
  /** Resolved intent (useful for tests + telemetry). */
  intent: JobChannelIntent;
  /** Human-readable side effects performed this turn (audit/demo aid). */
  sideEffects: string[];
}

/* ── Interview agent ─────────────────────────────────────────────────────── */

export interface InterviewStepResult {
  /** OpenUI to render to the candidate next. */
  openui: OpenUIDocument;
  /** Short agent line shown above the component. */
  text: string;
  /** Zero-based index of the step now being presented. */
  step: number;
  /** Total steps in the plan (excluding consent + completion). */
  totalSteps: number;
  /** True once the interview has reached the completion screen. */
  done: boolean;
}

/** A single question in a persisted interview plan. */
export interface PlannedQuestion {
  id: string;
  prompt: string;
  /** Maps to an interview OpenUI component. */
  kind: 'self_rating' | 'sql' | 'architecture' | 'question' | 'timed';
  /** The rubric criterion this question scores against. */
  criterionKey: string;
  payload?: Record<string, unknown>;
}

export interface RubricCriterion {
  key: string;
  label: string;
  weight: number;
}

export interface InterviewPlanDraft {
  roleBrief: string;
  rubric: { criteria: RubricCriterion[] };
  questionPlan: PlannedQuestion[];
}
