import { headers } from 'next/headers';
import { ensureMigrated } from '@yougrep/db';
import { getSessionContext, type SessionContext } from '@yougrep/auth';

/**
 * Server-side session helpers for App Router pages and route handlers. Every
 * entry point calls ensureMigrated() first so the lazily-created PGlite db is
 * ready (we deliberately avoid an instrumentation hook — see STATUS.md).
 */

export async function currentSession(): Promise<SessionContext | null> {
  await ensureMigrated();
  const h = await headers();
  return getSessionContext(h);
}

/** Session context that is guaranteed to have an active organization. */
export interface OrgSession extends SessionContext {
  organizationId: string;
}

/**
 * Returns the session if signed in AND has an active org, else null. Pages use
 * this to decide whether to redirect to /sign-in or /onboarding.
 */
export async function currentOrgSession(): Promise<OrgSession | null> {
  const ctx = await currentSession();
  if (!ctx || !ctx.organizationId) return null;
  return { ...ctx, organizationId: ctx.organizationId };
}
