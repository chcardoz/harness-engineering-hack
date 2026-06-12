import {
  appendInterviewTurn,
  getApplication,
  getInterviewSession,
  getPlanForChannel,
  listInterviewScores,
  listInterviewTurns,
  recordAudit,
  recordInterviewScore,
  saveResultPackage,
  updateApplicationStage,
  updateInterviewSession,
  type InterviewPlan,
  type InterviewResultPackage,
  type InterviewSession,
} from '@yougrep/domain';
import { doc, node, type OpenUIDocument, type OpenUINode } from '@yougrep/openui';
import type { OpenUIAction } from '@yougrep/openui';
import { INTERVIEW_SYSTEM_PROMPT } from './prompts';
import { criterionLabel } from './rubric';
import { scoreAnswer } from './scoring';
import { withAgentRun } from './runtime';
import type { InterviewStepResult, PlannedQuestion, RubricCriterion } from './types';

/**
 * The interview agent. ISOLATED by construction: it only ever reads the
 * persisted interview plan (distilled brief + rubric + question plan) and the
 * live session/turns. It imports nothing that exposes the recruiter thread or
 * raw connector data.
 */

const CONSENT_TEXT =
  'This interview is conducted by an AI agent and may be recorded for evaluation. ' +
  'Your responses are used only to assess this application.';

const CONSENT_POINTS = [
  'You can take your time on each question.',
  'There are a handful of short technical exercises.',
  'No camera or microphone is required for the text interview.',
];

/* ── Plan access (the only context boundary the agent crosses) ───────────── */

interface LoadedPlan {
  session: InterviewSession;
  plan: InterviewPlan;
  questions: PlannedQuestion[];
  criteria: RubricCriterion[];
}

function planQuestions(plan: InterviewPlan): PlannedQuestion[] {
  const raw = plan.questionPlan ?? [];
  return raw.map((q) => {
    const payload = (q.payload ?? {}) as Record<string, unknown>;
    const criterionKey =
      typeof payload['criterionKey'] === 'string' ? (payload['criterionKey'] as string) : 'depth';
    return {
      id: q.id,
      prompt: q.prompt,
      kind: (q.kind as PlannedQuestion['kind']) ?? 'question',
      criterionKey,
      payload,
    };
  });
}

async function loadPlan(organizationId: string, sessionId: string): Promise<LoadedPlan> {
  const session = await getInterviewSession(organizationId, sessionId);
  if (!session) throw new Error('Interview session not found');

  const plan = await getPlanForChannel(organizationId, session.jobChannelId);
  if (!plan) throw new Error('No interview plan for this role — the recruiter must publish first');

  return {
    session,
    plan,
    questions: planQuestions(plan),
    criteria: plan.rubric?.criteria ?? [],
  };
}

/* ── Rendering a question as OpenUI ──────────────────────────────────────── */

function questionNode(q: PlannedQuestion): OpenUINode {
  const p = q.payload ?? {};
  switch (q.kind) {
    case 'self_rating':
      return node('SkillSelfRating', {
        questionId: q.id,
        skill: typeof p['skill'] === 'string' ? (p['skill'] as string) : 'this role',
        min: typeof p['min'] === 'number' ? (p['min'] as number) : 1,
        max: typeof p['max'] === 'number' ? (p['max'] as number) : 5,
      });
    case 'sql':
      return node('SQLProblemEditor', {
        questionId: q.id,
        prompt: q.prompt,
        schemaHint: typeof p['schemaHint'] === 'string' ? (p['schemaHint'] as string) : undefined,
        starter: typeof p['starter'] === 'string' ? (p['starter'] as string) : undefined,
      });
    case 'architecture':
      return node('ArchitecturePrompt', {
        questionId: q.id,
        prompt: q.prompt,
        considerations: Array.isArray(p['considerations']) ? (p['considerations'] as string[]) : [],
      });
    case 'timed':
      return node('TimedExercise', {
        questionId: q.id,
        prompt: q.prompt,
        seconds: typeof p['seconds'] === 'number' ? (p['seconds'] as number) : 180,
      });
    case 'question':
    default:
      return node('QuestionCard', {
        questionId: q.id,
        prompt: q.prompt,
        helper: typeof p['helper'] === 'string' ? (p['helper'] as string) : undefined,
        inputKind:
          p['inputKind'] === 'text' || p['inputKind'] === 'choice' ? p['inputKind'] : 'longtext',
        choices: Array.isArray(p['choices']) ? (p['choices'] as string[]) : undefined,
      });
  }
}

function consentDoc(): OpenUIDocument {
  return doc(node('ConsentNotice', { text: CONSENT_TEXT, points: CONSENT_POINTS }));
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Begin (or resume) an interview session. Marks it in_progress and returns the
 * consent screen. The candidate must consent before the first question.
 */
export async function startInterviewSession(
  organizationId: string,
  sessionId: string,
): Promise<InterviewStepResult> {
  const { session, questions } = await loadPlan(organizationId, sessionId);

  const handle = await withAgentRun(
    {
      agentType: 'interview',
      organizationId,
      jobChannelId: session.jobChannelId,
    },
    async () => {
      if (session.sessionStatus === 'created') {
        await updateInterviewSession(organizationId, sessionId, {
          sessionStatus: 'in_progress',
          startedAt: new Date(),
          currentStep: 0,
        });
      }
      const document = consentDoc();
      await appendInterviewTurn({
        organizationId,
        sessionId,
        role: 'agent',
        content: 'Welcome — please review and consent to begin.',
        openui: document,
      });
      return { result: document, toolCalls: ['present_consent'] };
    },
  );

  return {
    openui: handle.result,
    text: "Welcome! When you're ready, consent and we'll begin.",
    step: -1,
    totalSteps: questions.length,
    done: false,
  };
}

/**
 * Advance the interview by one turn. Handles both the consent submission and
 * subsequent answers. The current question is determined server-side by
 * `session.currentStep`, so it does not depend on the client echoing a
 * question id.
 */
export async function submitInterviewAnswer(
  organizationId: string,
  sessionId: string,
  action: OpenUIAction,
): Promise<InterviewStepResult> {
  const loaded = await loadPlan(organizationId, sessionId);
  const { session, questions, criteria } = loaded;
  const total = questions.length;

  const handle = await withAgentRun(
    {
      agentType: 'interview',
      organizationId,
      jobChannelId: session.jobChannelId,
    },
    async () => {
      const toolCalls: string[] = [];

      // ── Consent gate ──────────────────────────────────────────────────
      if (!session.consentRecordedAt) {
        await updateInterviewSession(organizationId, sessionId, {
          consentRecordedAt: new Date(),
        });
        await appendInterviewTurn({
          organizationId,
          sessionId,
          role: 'candidate',
          content: 'Consent given.',
        });
        toolCalls.push('record_consent');

        const first = questions[0];
        const document = first
          ? doc(questionNode(first))
          : doc(
              node('InterviewComplete', {
                headline: 'All set',
                message: 'No questions configured.',
              }),
            );
        await appendInterviewTurn({
          organizationId,
          sessionId,
          role: 'agent',
          content: first?.prompt ?? '',
          openui: document,
          questionId: first?.id ?? null,
        });
        return {
          result: { document, step: 0, done: total === 0 },
          toolCalls,
        };
      }

      // ── Score the answer to the current question ──────────────────────
      const idx = session.currentStep;
      const current = questions[idx];
      if (current) {
        const answer = action.value;
        const answerText =
          typeof answer === 'string' ? answer : answer === undefined ? '' : JSON.stringify(answer);
        await appendInterviewTurn({
          organizationId,
          sessionId,
          role: 'candidate',
          content: answerText,
          questionId: current.id,
        });
        const { score, evidence } = scoreAnswer(current, answer);
        await recordInterviewScore({
          organizationId,
          sessionId,
          criterionKey: current.criterionKey,
          score,
          evidence: `${criterionLabel(criteria, current.criterionKey)}: ${evidence}`,
        });
        toolCalls.push(`score:${current.criterionKey}=${score}`);
      }

      const next = idx + 1;
      await updateInterviewSession(organizationId, sessionId, { currentStep: next });

      // ── More questions? ───────────────────────────────────────────────
      if (next < total) {
        const q = questions[next]!;
        const document = doc(questionNode(q));
        await appendInterviewTurn({
          organizationId,
          sessionId,
          role: 'agent',
          content: q.prompt,
          openui: document,
          questionId: q.id,
        });
        return { result: { document, step: next, done: false }, toolCalls };
      }

      // ── Done: complete + finalize the result package ──────────────────
      await updateInterviewSession(organizationId, sessionId, {
        sessionStatus: 'completed',
        endedAt: new Date(),
      });
      const document = doc(
        node('InterviewComplete', {
          headline: 'Interview complete',
          message:
            'Thanks for your time. Your responses have been recorded and shared with the hiring team. ' +
            "You'll hear back about next steps.",
        }),
      );
      await appendInterviewTurn({
        organizationId,
        sessionId,
        role: 'agent',
        content: 'Interview complete.',
        openui: document,
      });
      toolCalls.push('complete_interview');

      await finalizeInterviewResult(organizationId, sessionId, loaded);

      return { result: { document, step: next, done: true }, toolCalls };
    },
  );

  return {
    openui: handle.result.document,
    text: handle.result.done ? "That's everything — thank you!" : 'Got it. Next question.',
    step: handle.result.step,
    totalSteps: total,
    done: handle.result.done,
  };
}

/* ── Result package (the worker can also call this) ──────────────────────── */

function recommendationFor(overall: number): string {
  if (overall >= 78) return 'Strong yes';
  if (overall >= 62) return 'Yes';
  if (overall >= 45) return 'Maybe — needs follow-up';
  return 'No';
}

/**
 * Aggregate the recorded scores into a result package, update the application
 * stage, and audit it. Idempotent-ish: safe to call once at completion.
 */
export async function finalizeInterviewResult(
  organizationId: string,
  sessionId: string,
  preloaded?: LoadedPlan,
): Promise<InterviewResultPackage> {
  const loaded = preloaded ?? (await loadPlan(organizationId, sessionId));
  const { session, criteria } = loaded;

  const [scores, turns] = await Promise.all([
    listInterviewScores(organizationId, sessionId),
    listInterviewTurns(organizationId, sessionId),
  ]);

  // Average score per criterion (1–5).
  const byCriterion = new Map<string, number[]>();
  for (const s of scores) {
    const arr = byCriterion.get(s.criterionKey) ?? [];
    arr.push(s.score);
    byCriterion.set(s.criterionKey, arr);
  }

  const rubricScores = criteria.map((c) => {
    const arr = byCriterion.get(c.key) ?? [];
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return { key: c.key, label: c.label, score: Math.round(avg * 10) / 10 };
  });

  // Weighted overall on a 0–100 scale.
  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0) || 1;
  const weighted = criteria.reduce((acc, c) => {
    const rs = rubricScores.find((r) => r.key === c.key);
    return acc + ((rs?.score ?? 0) / 5) * c.weight;
  }, 0);
  const overall = Math.round((weighted / totalWeight) * 100);

  const ranked = [...rubricScores].sort((a, b) => b.score - a.score);
  const strengths = ranked
    .filter((r) => r.score >= 3.5)
    .slice(0, 3)
    .map((r) => `${r.label} (${r.score}/5)`);
  const concerns = ranked
    .filter((r) => r.score > 0 && r.score < 3)
    .slice(-2)
    .map((r) => `${r.label} (${r.score}/5)`);

  const recommendation = recommendationFor(overall);
  const summary =
    `Completed a ${scores.length}-question structured interview. ` +
    `Overall ${overall}/100 — ${recommendation}. ` +
    (strengths.length ? `Strongest: ${strengths.join('; ')}. ` : '') +
    (concerns.length ? `Watch: ${concerns.join('; ')}.` : '');

  const pkg = await saveResultPackage({
    organizationId,
    sessionId,
    applicationId: session.applicationId,
    candidateId: session.candidateId,
    jobChannelId: session.jobChannelId,
    overallScore: overall,
    recommendation,
    summary,
    strengths,
    concerns,
    rubricScores,
    transcriptRef: { turnCount: turns.length },
  });

  // Move the application forward and audit it.
  const application = await getApplication(organizationId, session.applicationId);
  if (application && application.stage !== 'shortlisted' && application.stage !== 'rejected') {
    await updateApplicationStage(organizationId, session.applicationId, 'interviewed');
  }
  await recordAudit({
    organizationId,
    action: 'interview_completed',
    targetType: 'interview_session',
    targetId: sessionId,
    metadata: { overall, recommendation },
  });

  return pkg;
}

export { INTERVIEW_SYSTEM_PROMPT };
