import { getDb, member, organization, eq, and, asc } from '@yougrep/db';
import { auth } from './auth';

/**
 * The org id for a fresh session. Prefer Better Auth's active organization; if
 * none is set (e.g. a returning user whose session was recreated, or an account
 * provisioned outside the create-org flow such as the demo seed), fall back to
 * the user's oldest membership. Still membership-gated — we only ever pick an
 * org the user actually belongs to.
 */
async function resolveOrganizationId(
  userId: string,
  activeOrganizationId: string | null | undefined,
): Promise<string | null> {
  if (activeOrganizationId) return activeOrganizationId;
  const db = getDb();
  const rows = await db
    .select({ id: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

export type SessionContext = {
  userId: string;
  email: string;
  name: string;
  /** Active organization for this session, if any. */
  organizationId: string | null;
};

/**
 * Resolve the current session from request headers. Returns null when there is
 * no valid session. The org id comes from the session's active organization.
 */
export async function getSessionContext(headers: Headers): Promise<SessionContext | null> {
  const result = await auth.api.getSession({ headers });
  if (!result?.session || !result.user) return null;
  return {
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    organizationId: await resolveOrganizationId(
      result.user.id,
      result.session.activeOrganizationId,
    ),
  };
}

/** Throwing variant for API routes. */
export async function requireSession(headers: Headers): Promise<SessionContext> {
  const ctx = await getSessionContext(headers);
  if (!ctx) throw new UnauthorizedError('Not signed in');
  return ctx;
}

/**
 * Ensure the user belongs to the given org. This is the second-layer tenant
 * check the blueprint requires on every protected query. Returns the role.
 */
export async function requireMembership(userId: string, organizationId: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new ForbiddenError('Not a member of this organization');
  return row.role;
}

/** Resolve an organization id from its public slug (used by the job board). */
export async function organizationIdBySlug(slug: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}

export class UnauthorizedError extends Error {
  status = 401 as const;
}
export class ForbiddenError extends Error {
  status = 403 as const;
}
