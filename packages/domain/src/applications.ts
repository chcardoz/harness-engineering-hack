import { getDb, applications, eq, and, desc } from '@yougrep/db';

export type Application = typeof applications.$inferSelect;

export async function createApplication(input: {
  organizationId: string;
  candidateId: string;
  jobChannelId: string;
  postingId?: string | null;
}): Promise<Application> {
  const db = getDb();
  const [row] = await db
    .insert(applications)
    .values({
      organizationId: input.organizationId,
      candidateId: input.candidateId,
      jobChannelId: input.jobChannelId,
      postingId: input.postingId ?? null,
      stage: 'applied',
    })
    .returning();
  if (!row) throw new Error('Failed to insert application');
  return row;
}

export async function listApplicationsForChannel(
  organizationId: string,
  jobChannelId: string,
): Promise<Application[]> {
  const db = getDb();
  return db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.organizationId, organizationId),
        eq(applications.jobChannelId, jobChannelId),
      ),
    )
    .orderBy(desc(applications.createdAt));
}

export async function getApplication(
  organizationId: string,
  applicationId: string,
): Promise<Application | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.organizationId, organizationId), eq(applications.id, applicationId)))
    .limit(1);
  return row ?? null;
}

export async function updateApplicationStage(
  organizationId: string,
  applicationId: string,
  stage: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(applications)
    .set({ stage, updatedAt: new Date() })
    .where(
      and(eq(applications.organizationId, organizationId), eq(applications.id, applicationId)),
    );
}
