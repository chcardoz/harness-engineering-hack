import {
  getDb,
  interviewPlans,
  interviewSessions,
  interviewTurns,
  interviewScores,
  interviewResultPackages,
  eq,
  and,
  asc,
  desc,
} from '@yougrep/db';

export type InterviewPlan = typeof interviewPlans.$inferSelect;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InterviewTurn = typeof interviewTurns.$inferSelect;
export type InterviewScore = typeof interviewScores.$inferSelect;
export type InterviewResultPackage = typeof interviewResultPackages.$inferSelect;

/* ── Interview Plans ─────────────────────────────────────────────────────── */

export async function saveInterviewPlan(input: {
  organizationId: string;
  jobChannelId: string;
  roleBrief: string;
  rubric?: { criteria: { key: string; label: string; weight: number }[] } | null;
  questionPlan?:
    | { id: string; prompt: string; kind: string; payload?: Record<string, unknown> }[]
    | null;
}): Promise<InterviewPlan> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(interviewPlans)
    .where(
      and(
        eq(interviewPlans.organizationId, input.organizationId),
        eq(interviewPlans.jobChannelId, input.jobChannelId),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(interviewPlans)
      .set({
        roleBrief: input.roleBrief,
        rubric: input.rubric ?? null,
        questionPlan: input.questionPlan ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(interviewPlans.organizationId, input.organizationId),
          eq(interviewPlans.id, existing.id),
        ),
      )
      .returning();
    if (!updated) throw new Error('Failed to update interview plan');
    return updated;
  }

  const [row] = await db
    .insert(interviewPlans)
    .values({
      organizationId: input.organizationId,
      jobChannelId: input.jobChannelId,
      roleBrief: input.roleBrief,
      rubric: input.rubric ?? null,
      questionPlan: input.questionPlan ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to insert interview plan');
  return row;
}

export async function getPlanForChannel(
  organizationId: string,
  jobChannelId: string,
): Promise<InterviewPlan | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewPlans)
    .where(
      and(
        eq(interviewPlans.organizationId, organizationId),
        eq(interviewPlans.jobChannelId, jobChannelId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/* ── Interview Sessions ──────────────────────────────────────────────────── */

export async function createInterviewSession(input: {
  organizationId: string;
  applicationId: string;
  candidateId: string;
  jobChannelId: string;
  planId?: string | null;
  mode?: string;
}): Promise<InterviewSession> {
  const db = getDb();
  const [row] = await db
    .insert(interviewSessions)
    .values({
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      candidateId: input.candidateId,
      jobChannelId: input.jobChannelId,
      planId: input.planId ?? null,
      mode: input.mode ?? 'text',
      sessionStatus: 'created',
    })
    .returning();
  if (!row) throw new Error('Failed to insert interview session');
  return row;
}

/**
 * Capability lookup by session id alone (NOT org-scoped). The session id is an
 * unguessable UUID that acts as the bearer token for the public, unauthenticated
 * candidate interview boundary. Use ONLY there; everywhere else use the
 * org-scoped getInterviewSession.
 */
export async function getInterviewSessionByCapability(
  sessionId: string,
): Promise<InterviewSession | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId))
    .limit(1);
  return row ?? null;
}

export async function getInterviewSession(
  organizationId: string,
  sessionId: string,
): Promise<InterviewSession | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewSessions)
    .where(
      and(
        eq(interviewSessions.organizationId, organizationId),
        eq(interviewSessions.id, sessionId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function updateInterviewSession(
  organizationId: string,
  sessionId: string,
  patch: Partial<
    Pick<
      InterviewSession,
      | 'sessionStatus'
      | 'currentStep'
      | 'startedAt'
      | 'endedAt'
      | 'consentRecordedAt'
      | 'recordingUrl'
    >
  >,
): Promise<InterviewSession | null> {
  const db = getDb();
  const [row] = await db
    .update(interviewSessions)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(interviewSessions.organizationId, organizationId),
        eq(interviewSessions.id, sessionId),
      ),
    )
    .returning();
  return row ?? null;
}

/* ── Interview Turns ─────────────────────────────────────────────────────── */

export async function appendInterviewTurn(input: {
  organizationId: string;
  sessionId: string;
  role: string;
  content: string;
  openui?: Record<string, unknown> | null;
  questionId?: string | null;
}): Promise<InterviewTurn> {
  const db = getDb();
  const [row] = await db
    .insert(interviewTurns)
    .values({
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      openui: input.openui ?? null,
      questionId: input.questionId ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to insert interview turn');
  return row;
}

export async function listInterviewTurns(
  organizationId: string,
  sessionId: string,
): Promise<InterviewTurn[]> {
  const db = getDb();
  return db
    .select()
    .from(interviewTurns)
    .where(
      and(
        eq(interviewTurns.organizationId, organizationId),
        eq(interviewTurns.sessionId, sessionId),
      ),
    )
    .orderBy(asc(interviewTurns.createdAt));
}

/* ── Interview Scores ────────────────────────────────────────────────────── */

export async function recordInterviewScore(input: {
  organizationId: string;
  sessionId: string;
  criterionKey: string;
  score: number;
  evidence?: string | null;
}): Promise<void> {
  const db = getDb();
  await db.insert(interviewScores).values({
    organizationId: input.organizationId,
    sessionId: input.sessionId,
    criterionKey: input.criterionKey,
    score: input.score,
    evidence: input.evidence ?? null,
  });
}

export async function listInterviewScores(
  organizationId: string,
  sessionId: string,
): Promise<InterviewScore[]> {
  const db = getDb();
  return db
    .select()
    .from(interviewScores)
    .where(
      and(
        eq(interviewScores.organizationId, organizationId),
        eq(interviewScores.sessionId, sessionId),
      ),
    )
    .orderBy(asc(interviewScores.createdAt));
}

/* ── Interview Result Packages ───────────────────────────────────────────── */

export async function saveResultPackage(input: {
  organizationId: string;
  sessionId: string;
  applicationId: string;
  candidateId: string;
  jobChannelId: string;
  overallScore?: number | null;
  recommendation?: string | null;
  summary?: string | null;
  strengths?: string[] | null;
  concerns?: string[] | null;
  rubricScores?: { key: string; label: string; score: number }[] | null;
  transcriptRef?: { turnCount: number } | null;
}): Promise<InterviewResultPackage> {
  const db = getDb();
  const [row] = await db
    .insert(interviewResultPackages)
    .values({
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      applicationId: input.applicationId,
      candidateId: input.candidateId,
      jobChannelId: input.jobChannelId,
      overallScore: input.overallScore ?? null,
      recommendation: input.recommendation ?? null,
      summary: input.summary ?? null,
      strengths: input.strengths ?? null,
      concerns: input.concerns ?? null,
      rubricScores: input.rubricScores ?? null,
      transcriptRef: input.transcriptRef ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to insert interview result package');
  return row;
}

export async function listResultPackagesForChannel(
  organizationId: string,
  jobChannelId: string,
): Promise<InterviewResultPackage[]> {
  const db = getDb();
  return db
    .select()
    .from(interviewResultPackages)
    .where(
      and(
        eq(interviewResultPackages.organizationId, organizationId),
        eq(interviewResultPackages.jobChannelId, jobChannelId),
      ),
    )
    .orderBy(desc(interviewResultPackages.createdAt));
}

export async function getResultPackageForSession(
  organizationId: string,
  sessionId: string,
): Promise<InterviewResultPackage | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewResultPackages)
    .where(
      and(
        eq(interviewResultPackages.organizationId, organizationId),
        eq(interviewResultPackages.sessionId, sessionId),
      ),
    )
    .limit(1);
  return row ?? null;
}
