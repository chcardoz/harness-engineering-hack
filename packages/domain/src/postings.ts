import { getDb, jobBoardPostings, organization, eq, and, desc } from '@yougrep/db';
import { slugify } from '@yougrep/config';

export type JobBoardPosting = typeof jobBoardPostings.$inferSelect;
// Org row shape — used in public-board return values.
export type OrgRow = typeof organization.$inferSelect;

export async function publishPosting(input: {
  organizationId: string;
  jobChannelId: string;
  listing: {
    title: string;
    location?: string | null;
    summary?: string | null;
    contentSnapshot?: Record<string, unknown>;
    jobListingId?: string | null;
  };
  now?: Date;
}): Promise<JobBoardPosting> {
  const db = getDb();
  const now = input.now ?? new Date();
  const base = slugify(input.listing.title);

  // Gather existing slugs for this org to ensure uniqueness.
  const existing = await db
    .select({ slug: jobBoardPostings.slug })
    .from(jobBoardPostings)
    .where(eq(jobBoardPostings.organizationId, input.organizationId));

  const slugSet = new Set(existing.map((r) => r.slug));

  // Find if there's already a posting for this channel.
  const [existingPosting] = await db
    .select()
    .from(jobBoardPostings)
    .where(
      and(
        eq(jobBoardPostings.organizationId, input.organizationId),
        eq(jobBoardPostings.jobChannelId, input.jobChannelId),
      ),
    )
    .limit(1);

  if (existingPosting) {
    // Update the existing posting, keep its slug.
    const [updated] = await db
      .update(jobBoardPostings)
      .set({
        title: input.listing.title,
        location: input.listing.location ?? null,
        summary: input.listing.summary ?? null,
        contentSnapshot: input.listing.contentSnapshot ?? null,
        jobListingId: input.listing.jobListingId ?? null,
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(jobBoardPostings.organizationId, input.organizationId),
          eq(jobBoardPostings.id, existingPosting.id),
        ),
      )
      .returning();
    if (!updated) throw new Error('Failed to update posting');
    return updated;
  }

  // Generate a unique slug.
  let slug = base;
  let counter = 2;
  // Remove current channel's potential slug (it's new, not in the set).
  while (slugSet.has(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }

  const [row] = await db
    .insert(jobBoardPostings)
    .values({
      organizationId: input.organizationId,
      jobChannelId: input.jobChannelId,
      jobListingId: input.listing.jobListingId ?? null,
      slug,
      title: input.listing.title,
      location: input.listing.location ?? null,
      summary: input.listing.summary ?? null,
      contentSnapshot: input.listing.contentSnapshot ?? null,
      status: 'published',
      publishedAt: now,
    })
    .returning();
  if (!row) throw new Error('Failed to insert posting');
  return row;
}

export async function listPublishedPostingsByOrgSlug(
  orgSlug: string,
): Promise<{ org: OrgRow; postings: JobBoardPosting[] } | null> {
  const db = getDb();
  const [org] = await db.select().from(organization).where(eq(organization.slug, orgSlug)).limit(1);
  if (!org) return null;

  const postings = await db
    .select()
    .from(jobBoardPostings)
    .where(
      and(eq(jobBoardPostings.organizationId, org.id), eq(jobBoardPostings.status, 'published')),
    )
    .orderBy(desc(jobBoardPostings.publishedAt));

  return { org, postings };
}

export async function getPublishedPosting(
  orgSlug: string,
  jobSlug: string,
): Promise<{ org: OrgRow; posting: JobBoardPosting } | null> {
  const db = getDb();
  const [org] = await db.select().from(organization).where(eq(organization.slug, orgSlug)).limit(1);
  if (!org) return null;

  const [posting] = await db
    .select()
    .from(jobBoardPostings)
    .where(
      and(
        eq(jobBoardPostings.organizationId, org.id),
        eq(jobBoardPostings.slug, jobSlug),
        eq(jobBoardPostings.status, 'published'),
      ),
    )
    .limit(1);
  if (!posting) return null;

  return { org, posting };
}

export async function listOrgPostings(organizationId: string): Promise<JobBoardPosting[]> {
  const db = getDb();
  return db
    .select()
    .from(jobBoardPostings)
    .where(eq(jobBoardPostings.organizationId, organizationId))
    .orderBy(desc(jobBoardPostings.createdAt));
}
