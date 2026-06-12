import { getDb, candidates, eq, and, asc } from '@yougrep/db';

export type Candidate = typeof candidates.$inferSelect;

export async function upsertCandidate(input: {
  organizationId: string;
  email: string;
  name?: string | null;
  headline?: string | null;
}): Promise<Candidate> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(candidates)
    .where(
      and(eq(candidates.organizationId, input.organizationId), eq(candidates.email, input.email)),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(candidates)
      .set({
        name: input.name ?? existing.name,
        headline: input.headline ?? existing.headline,
        updatedAt: new Date(),
      })
      .where(
        and(eq(candidates.organizationId, input.organizationId), eq(candidates.id, existing.id)),
      )
      .returning();
    if (!updated) throw new Error('Failed to update candidate');
    return updated;
  }

  const [row] = await db
    .insert(candidates)
    .values({
      organizationId: input.organizationId,
      email: input.email,
      name: input.name ?? null,
      headline: input.headline ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to insert candidate');
  return row;
}

export async function listCandidates(organizationId: string): Promise<Candidate[]> {
  const db = getDb();
  return db
    .select()
    .from(candidates)
    .where(eq(candidates.organizationId, organizationId))
    .orderBy(asc(candidates.createdAt));
}

export async function getCandidate(
  organizationId: string,
  candidateId: string,
): Promise<Candidate | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.organizationId, organizationId), eq(candidates.id, candidateId)))
    .limit(1);
  return row ?? null;
}
