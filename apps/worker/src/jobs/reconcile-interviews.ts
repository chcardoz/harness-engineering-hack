/**
 * Finalize-backstop reconciliation job.
 *
 * The interview agent finalizes a candidate's result package INLINE the moment
 * they finish (see `submitInterviewAnswer` -> `finalizeInterviewResult` in
 * @yougrep/agents). This job is the background safety net: it finds interview
 * sessions that are `completed` but have NO result package yet — i.e. cases
 * where the inline finalize was missed or failed mid-flight — and finalizes
 * them.
 *
 * Idempotency: `finalizeInterviewResult` always INSERTs a fresh result package,
 * so it is NOT safe to call blindly on a re-run. The idempotency guard lives
 * HERE: we only call it for sessions whose `getResultPackageForSession` returns
 * null. Re-running this pass after a successful finalize is therefore a no-op.
 *
 * Tenant boundary (CLAUDE.md): every read/write is scoped by organization_id.
 * `reconcileInterviews` operates over an explicit set of organization ids — it
 * never sweeps the whole table without an org filter.
 *
 * Enumeration limitation: there is no domain function to "list completed
 * sessions" (and per the buildout rules we must not add one to @yougrep/domain
 * from the worker, since it can't be tested here). We therefore enumerate
 * `completed` sessions with a tenant-scoped Drizzle query against
 * @yougrep/db directly — always filtered by organization_id — and then route
 * every actual finalize through the existing domain/agent layer.
 */
import { getDb, interviewSessions, eq, and, inArray, asc } from '@yougrep/db';
import { getResultPackageForSession } from '@yougrep/domain';
import { finalizeInterviewResult } from '@yougrep/agents';
import { INTERVIEW_STATUS } from '@yougrep/config';

const COMPLETED: (typeof INTERVIEW_STATUS)[number] = 'completed';

export interface ReconcileInterviewsResult {
  /** Number of result packages newly written by this pass. */
  finalized: number;
  /** Number of completed sessions examined across the given org(s). */
  examined: number;
  /** Session ids that failed to finalize (logged, not thrown). */
  failedSessionIds: string[];
}

export interface ReconcileInterviewsOptions {
  /**
   * One or more organization ids to reconcile. Required: the job never runs
   * untenanted. Pass a single id or a list (e.g. when sweeping every known org
   * from the runtime loop).
   */
  organizationIds: string | string[];
}

/**
 * Run ONE reconciliation pass (no loop, no timers — this is the testable unit).
 * For every `completed` interview session in the given org(s) that has no
 * result package, call `finalizeInterviewResult`. Returns how many were
 * finalized. Per-session failures are collected and reported, not thrown, so
 * one bad session can't stall the rest of the pass.
 */
export async function reconcileInterviews(
  options: ReconcileInterviewsOptions,
): Promise<ReconcileInterviewsResult> {
  const orgIds = Array.isArray(options.organizationIds)
    ? options.organizationIds
    : [options.organizationIds];

  const result: ReconcileInterviewsResult = {
    finalized: 0,
    examined: 0,
    failedSessionIds: [],
  };

  if (orgIds.length === 0) return result;

  const db = getDb();

  // Tenant-scoped enumeration: completed sessions in the requested org(s) only.
  const sessions = await db
    .select({
      id: interviewSessions.id,
      organizationId: interviewSessions.organizationId,
    })
    .from(interviewSessions)
    .where(
      and(
        inArray(interviewSessions.organizationId, orgIds),
        eq(interviewSessions.sessionStatus, COMPLETED),
      ),
    )
    .orderBy(asc(interviewSessions.createdAt));

  result.examined = sessions.length;

  for (const session of sessions) {
    try {
      // Idempotency guard: skip anything already finalized.
      const existing = await getResultPackageForSession(session.organizationId, session.id);
      if (existing) continue;

      await finalizeInterviewResult(session.organizationId, session.id);
      result.finalized += 1;
    } catch (err) {
      result.failedSessionIds.push(session.id);
      console.error(
        `[worker:reconcile] failed to finalize session ${session.id} (org ${session.organizationId})`,
        err,
      );
    }
  }

  return result;
}
