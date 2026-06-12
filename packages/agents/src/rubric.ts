import type { DistilledBrief } from './connector-context';
import type { InterviewPlanDraft, PlannedQuestion, RubricCriterion } from './types';

/**
 * Build the interview handoff object — the distilled brief, scoring rubric, and
 * ordered question plan — from a role brief. This is the ONLY thing that
 * crosses the boundary into the interview agent, so it must be self-contained
 * and free of recruiter-private data (comp, internal Slack chatter).
 */

const POSTGRES_RUBRIC: RubricCriterion[] = [
  { key: 'pg_internals', label: 'Postgres internals (MVCC, vacuum, WAL)', weight: 0.25 },
  { key: 'query_perf', label: 'Query performance & indexing', weight: 0.25 },
  { key: 'replication', label: 'Replication & recovery', weight: 0.2 },
  { key: 'operations', label: 'Operational ownership & incident response', weight: 0.2 },
  { key: 'communication', label: 'Communication & clarity', weight: 0.1 },
];

const GENERIC_RUBRIC: RubricCriterion[] = [
  { key: 'depth', label: 'Technical depth', weight: 0.4 },
  { key: 'problem_solving', label: 'Problem solving', weight: 0.3 },
  { key: 'operations', label: 'Operational maturity', weight: 0.2 },
  { key: 'communication', label: 'Communication & clarity', weight: 0.1 },
];

function postgresQuestions(): PlannedQuestion[] {
  return [
    {
      id: 'q_self_rating',
      kind: 'self_rating',
      criterionKey: 'communication',
      prompt: 'How would you rate your hands-on Postgres experience?',
      payload: { skill: 'Production Postgres', min: 1, max: 5 },
    },
    {
      id: 'q_mvcc',
      kind: 'question',
      criterionKey: 'pg_internals',
      prompt:
        'Explain MVCC in Postgres and why it matters for a long-running transaction. ' +
        'What operational problem can long-running transactions cause?',
      payload: {
        helper: 'Touch on tuple visibility, dead tuples, and vacuum.',
        inputKind: 'longtext',
      },
    },
    {
      id: 'q_sql',
      kind: 'sql',
      criterionKey: 'query_perf',
      prompt:
        'The query below drains a job queue and has become slow on a 50M-row table. ' +
        'Rewrite it and/or propose an index so it stays fast.',
      payload: {
        schemaHint:
          'events(id bigint pk, user_id bigint, processed boolean default false, created_at timestamptz)',
        starter: 'SELECT * FROM events\nWHERE processed = false\nORDER BY created_at\nLIMIT 100;',
      },
    },
    {
      id: 'q_replication',
      kind: 'architecture',
      criterionKey: 'replication',
      prompt:
        'A read replica fell ~12 minutes behind during a bulk DELETE of 8M rows. ' +
        'Walk through what happened and how you would prevent it.',
      payload: {
        considerations: [
          'WAL generation and replication bandwidth',
          'Batching strategy for large writes',
          'Guardrails: statement_timeout, locks, monitoring',
        ],
      },
    },
    {
      id: 'q_incident',
      kind: 'timed',
      criterionKey: 'operations',
      prompt:
        'In 3 minutes: describe one production Postgres incident you owned end to end — ' +
        'detection, mitigation, and the durable fix you shipped.',
      payload: { seconds: 180 },
    },
  ];
}

function genericQuestions(brief: DistilledBrief): PlannedQuestion[] {
  return [
    {
      id: 'q_self_rating',
      kind: 'self_rating',
      criterionKey: 'communication',
      prompt: `How would you rate your experience for the ${brief.title} role?`,
      payload: { skill: brief.title, min: 1, max: 5 },
    },
    {
      id: 'q_depth',
      kind: 'question',
      criterionKey: 'depth',
      prompt: `Describe the most technically demanding problem you have solved relevant to ${brief.title}.`,
      payload: { inputKind: 'longtext' },
    },
    {
      id: 'q_design',
      kind: 'architecture',
      criterionKey: 'problem_solving',
      prompt: 'Sketch how you would approach a system central to this role from first principles.',
      payload: { considerations: brief.mustHaves.slice(0, 3) },
    },
    {
      id: 'q_incident',
      kind: 'timed',
      criterionKey: 'operations',
      prompt: 'In 3 minutes: describe an incident or hard call you owned and what you learned.',
      payload: { seconds: 180 },
    },
  ];
}

export function buildInterviewPlanDraft(brief: DistilledBrief): InterviewPlanDraft {
  const isPostgres = brief.title.toLowerCase().includes('postgres');
  const roleBrief = [
    brief.title,
    '',
    brief.summary,
    '',
    brief.mustHaves.length ? `Must-haves:\n- ${brief.mustHaves.join('\n- ')}` : '',
    brief.niceToHaves.length ? `Nice-to-haves:\n- ${brief.niceToHaves.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    roleBrief,
    rubric: { criteria: isPostgres ? POSTGRES_RUBRIC : GENERIC_RUBRIC },
    questionPlan: isPostgres ? postgresQuestions() : genericQuestions(brief),
  };
}

/** Look up a rubric criterion's human label, with a safe fallback. */
export function criterionLabel(criteria: RubricCriterion[], key: string): string {
  return criteria.find((c) => c.key === key)?.label ?? key;
}
