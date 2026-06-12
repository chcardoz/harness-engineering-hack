import { z } from 'zod';

/**
 * Yougrep OpenUI contract — the single source of truth shared by the agents
 * (which PRODUCE these documents) and the renderer (which CONSUMES them).
 *
 * This is a constrained, predefined-component model: the agent may only select
 * a component from the library below and supply props that pass validation.
 * The renderer never executes arbitrary model code — unknown components and
 * invalid props fall back to a safe text rendering.
 */

export const OPENUI_VERSION = '0.5' as const;

/** Recruiter-workspace component library. */
export const RECRUITER_COMPONENTS = [
  'JobBriefCard',
  'ConnectorStatus',
  'JobListingDraft',
  'CandidateCard',
  'CandidateComparisonTable',
  'InterviewSummary',
  'PipelineChart',
  'NextActionButtons',
  'ConfirmPublish',
] as const;

/** Candidate-interview component library. */
export const INTERVIEW_COMPONENTS = [
  'QuestionCard',
  'SkillSelfRating',
  'SQLProblemEditor',
  'ArchitecturePrompt',
  'TimedExercise',
  'RubricProgress',
  'ConsentNotice',
  'InterviewComplete',
] as const;

export const ALL_COMPONENTS = [...RECRUITER_COMPONENTS, ...INTERVIEW_COMPONENTS] as const;
export type ComponentName = (typeof ALL_COMPONENTS)[number];

/* ── Per-component prop schemas ─────────────────────────────────────────── */

const bullet = z.string().min(1);

export const componentSchemas = {
  JobBriefCard: z.object({
    title: z.string(),
    summary: z.string(),
    mustHaves: z.array(bullet).default([]),
    sourcedFrom: z.array(z.string()).optional(),
  }),
  ConnectorStatus: z.object({
    connectors: z.array(
      z.object({
        provider: z.string(),
        status: z.enum(['connected', 'syncing', 'error', 'disconnected']),
        detail: z.string().optional(),
      }),
    ),
  }),
  JobListingDraft: z.object({
    title: z.string(),
    location: z.string().optional(),
    employmentType: z.string().optional(),
    salaryRange: z.string().optional(),
    summary: z.string(),
    responsibilities: z.array(bullet).default([]),
    requirements: z.array(bullet).default([]),
    niceToHaves: z.array(bullet).default([]),
    listingId: z.string().optional(),
  }),
  CandidateCard: z.object({
    candidateId: z.string().optional(),
    name: z.string(),
    headline: z.string().optional(),
    overallScore: z.number().min(0).max(100).optional(),
    recommendation: z.string().optional(),
    strengths: z.array(bullet).default([]),
    concerns: z.array(bullet).default([]),
  }),
  CandidateComparisonTable: z.object({
    criteria: z.array(z.object({ key: z.string(), label: z.string() })),
    candidates: z.array(
      z.object({
        candidateId: z.string().optional(),
        name: z.string(),
        overallScore: z.number().optional(),
        scores: z.record(z.string(), z.number()),
        note: z.string().optional(),
      }),
    ),
  }),
  InterviewSummary: z.object({
    candidateName: z.string(),
    overallScore: z.number().optional(),
    recommendation: z.string().optional(),
    summary: z.string(),
    rubricScores: z
      .array(z.object({ key: z.string(), label: z.string(), score: z.number() }))
      .default([]),
  }),
  PipelineChart: z.object({
    stages: z.array(z.object({ label: z.string(), count: z.number() })),
  }),
  NextActionButtons: z.object({
    prompt: z.string().optional(),
    actions: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        kind: z.enum(['primary', 'secondary', 'danger']).default('secondary'),
        /** True if this action mutates state and needs explicit confirmation. */
        confirm: z.boolean().default(false),
      }),
    ),
  }),
  ConfirmPublish: z.object({
    title: z.string(),
    summary: z.string(),
    orgSlug: z.string().optional(),
    jobSlug: z.string().optional(),
    listingId: z.string().optional(),
    note: z.string().optional(),
  }),

  /* interview */
  QuestionCard: z.object({
    questionId: z.string(),
    prompt: z.string(),
    helper: z.string().optional(),
    inputKind: z.enum(['text', 'longtext', 'choice']).default('longtext'),
    choices: z.array(z.string()).optional(),
  }),
  SkillSelfRating: z.object({
    questionId: z.string(),
    skill: z.string(),
    min: z.number().default(1),
    max: z.number().default(5),
  }),
  SQLProblemEditor: z.object({
    questionId: z.string(),
    prompt: z.string(),
    schemaHint: z.string().optional(),
    starter: z.string().optional(),
  }),
  ArchitecturePrompt: z.object({
    questionId: z.string(),
    prompt: z.string(),
    considerations: z.array(bullet).default([]),
  }),
  TimedExercise: z.object({
    questionId: z.string(),
    prompt: z.string(),
    seconds: z.number().default(180),
  }),
  RubricProgress: z.object({
    criteria: z.array(z.object({ key: z.string(), label: z.string(), done: z.boolean() })),
  }),
  ConsentNotice: z.object({
    text: z.string(),
    points: z.array(bullet).default([]),
  }),
  InterviewComplete: z.object({
    headline: z.string(),
    message: z.string(),
  }),
} satisfies Record<ComponentName, z.ZodTypeAny>;

export type ComponentProps<K extends ComponentName> = z.infer<(typeof componentSchemas)[K]>;

/* ── Document shape ─────────────────────────────────────────────────────── */

export type OpenUINode = {
  component: ComponentName;
  props: Record<string, unknown>;
};

export type OpenUIDocument = {
  version: typeof OPENUI_VERSION;
  /** A vertical stack of one or more predefined component cards. */
  nodes: OpenUINode[];
};

/** Action emitted by an interactive component (button press, input submit). */
export type OpenUIAction = {
  /** Action id from NextActionButtons, or a synthetic one (e.g. 'answer'). */
  actionId: string;
  /** Component that emitted it. */
  component: ComponentName;
  /** Optional payload — e.g. the answer text, the selected score. */
  value?: unknown;
  /** For interview components, the question this answer belongs to. */
  questionId?: string;
  /** For confirmable mutations, whether the user confirmed. */
  confirmed?: boolean;
};

export type OpenUIActionHandler = (action: OpenUIAction) => void;

/** Validate a single node; returns parsed props or an error message. */
export function validateNode(
  node: OpenUINode,
): { ok: true; props: Record<string, unknown> } | { ok: false; error: string } {
  const schema = (componentSchemas as Record<string, z.ZodTypeAny>)[node.component];
  if (!schema) return { ok: false, error: `Unknown component "${node.component}"` };
  const parsed = schema.safeParse(node.props ?? {});
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid props' };
  return { ok: true, props: parsed.data as Record<string, unknown> };
}

/** Helper for agents: build a validated document, throwing on contract violation. */
export function doc(...nodes: OpenUINode[]): OpenUIDocument {
  for (const n of nodes) {
    const v = validateNode(n);
    if (!v.ok) throw new Error(`OpenUI contract violation in ${n.component}: ${v.error}`);
  }
  return { version: OPENUI_VERSION, nodes };
}

/** Typed node constructor used by agents to get prop autocompletion. */
export function node<K extends ComponentName>(component: K, props: ComponentProps<K>): OpenUINode {
  return { component, props: props as Record<string, unknown> };
}
