import { getDb, jobListings, eq, and, desc } from '@yougrep/db';

export type JobListing = typeof jobListings.$inferSelect;

export async function upsertJobListing(input: {
  organizationId: string;
  jobChannelId: string;
  title: string;
  location?: string | null;
  employmentType?: string | null;
  summary?: string | null;
  description?: string | null;
  responsibilities?: string[] | null;
  requirements?: string[] | null;
  niceToHaves?: string[] | null;
  salaryRange?: string | null;
  status?: string;
  createdByUserId?: string | null;
}): Promise<JobListing> {
  const db = getDb();

  // Check if a listing already exists for this channel (one per channel).
  const [existing] = await db
    .select()
    .from(jobListings)
    .where(
      and(
        eq(jobListings.organizationId, input.organizationId),
        eq(jobListings.jobChannelId, input.jobChannelId),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(jobListings)
      .set({
        title: input.title,
        location: input.location ?? null,
        employmentType: input.employmentType ?? null,
        summary: input.summary ?? null,
        description: input.description ?? null,
        responsibilities: input.responsibilities ?? null,
        requirements: input.requirements ?? null,
        niceToHaves: input.niceToHaves ?? null,
        salaryRange: input.salaryRange ?? null,
        status: input.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(
        and(eq(jobListings.organizationId, input.organizationId), eq(jobListings.id, existing.id)),
      )
      .returning();
    if (!updated) throw new Error('Failed to update job listing');
    return updated;
  }

  const [row] = await db
    .insert(jobListings)
    .values({
      organizationId: input.organizationId,
      jobChannelId: input.jobChannelId,
      title: input.title,
      location: input.location ?? null,
      employmentType: input.employmentType ?? null,
      summary: input.summary ?? null,
      description: input.description ?? null,
      responsibilities: input.responsibilities ?? null,
      requirements: input.requirements ?? null,
      niceToHaves: input.niceToHaves ?? null,
      salaryRange: input.salaryRange ?? null,
      status: input.status ?? 'draft',
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to insert job listing');
  return row;
}

export async function getListingForChannel(
  organizationId: string,
  jobChannelId: string,
): Promise<JobListing | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(jobListings)
    .where(
      and(
        eq(jobListings.organizationId, organizationId),
        eq(jobListings.jobChannelId, jobChannelId),
      ),
    )
    .orderBy(desc(jobListings.createdAt))
    .limit(1);
  return row ?? null;
}
