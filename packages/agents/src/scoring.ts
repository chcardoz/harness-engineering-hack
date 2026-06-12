import type { PlannedQuestion } from './types';

/**
 * Deterministic answer scoring. We score 1–5 against the question's rubric
 * criterion using two signals: substance (is there a real, specific answer?)
 * and signal-term coverage (did the candidate hit the concepts a strong answer
 * would mention?). No randomness, so the demo and tests are reproducible. In a
 * live deployment this is where a model-graded rubric pass would slot in.
 */

const SIGNAL_TERMS: Record<string, string[]> = {
  pg_internals: ['mvcc', 'vacuum', 'tuple', 'wal', 'visibility', 'bloat', 'autovacuum', 'xid'],
  query_perf: [
    'index',
    'explain',
    'analyze',
    'partial',
    'btree',
    'gin',
    'brin',
    'seq scan',
    'plan',
  ],
  replication: ['replica', 'wal', 'streaming', 'logical', 'lag', 'batch', 'pitr', 'recovery'],
  operations: [
    'incident',
    'on-call',
    'monitor',
    'alert',
    'postmortem',
    'mitigat',
    'rollback',
    'timeout',
  ],
  depth: ['because', 'trade-off', 'tradeoff', 'design', 'scale', 'constraint'],
  problem_solving: ['approach', 'first', 'option', 'consider', 'because', 'alternative'],
  communication: [],
};

export interface AnswerScore {
  score: number;
  evidence: string;
}

export function scoreAnswer(question: PlannedQuestion, rawAnswer: unknown): AnswerScore {
  // Self-rating questions: the candidate's number IS the signal, lightly damped.
  if (question.kind === 'self_rating') {
    const n = typeof rawAnswer === 'number' ? rawAnswer : Number(rawAnswer);
    const clamped = Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 3;
    return { score: clamped, evidence: `Candidate self-rated ${clamped}/5.` };
  }

  const answer = typeof rawAnswer === 'string' ? rawAnswer : String(rawAnswer ?? '');
  const text = answer.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;

  // Substance: empty/one-liner answers cannot score well.
  let substance = 1;
  if (words >= 8) substance = 2;
  if (words >= 25) substance = 3;
  if (words >= 60) substance = 4;

  // Coverage: how many concept terms did they hit?
  const terms = SIGNAL_TERMS[question.criterionKey] ?? [];
  const hits = terms.filter((t) => text.includes(t)).length;
  const coverage = terms.length === 0 ? 0 : Math.min(2, hits >= 3 ? 2 : hits >= 1 ? 1 : 0);

  const score = Math.min(5, Math.max(1, substance + coverage));

  const matched = terms.filter((t) => text.includes(t));
  const evidence =
    words === 0
      ? 'No answer provided.'
      : `~${words} words` +
        (matched.length
          ? `; mentioned ${matched.slice(0, 4).join(', ')}`
          : '; no key concepts surfaced') +
        `.`;

  return { score, evidence };
}
