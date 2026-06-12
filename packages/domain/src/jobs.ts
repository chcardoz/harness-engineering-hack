import { getDb, jobChannels, eq, and, desc } from '@yougrep/db';
import { slugify } from '@yougrep/config';

export type JobChannel = typeof jobChannels.$inferSelect;

export async function createJobChannel(input: {
  organizationId: string;
  name: string;
  purpose?: string;
  createdByUserId?: string;
}): Promise<JobChannel> {
  const db = getDb();
  const base = slugify(input.name);

  // Find all existing slugs in this org that start with the base slug.
  const existing = await db
    .select({ slug: jobChannels.slug })
    .from(jobChannels)
    .where(eq(jobChannels.organizationId, input.organizationId));

  const slugSet = new Set(existing.map((r) => r.slug));

  let slug = base;
  let counter = 2;
  while (slugSet.has(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }

  const [row] = await db
    .insert(jobChannels)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      slug,
      purpose: input.purpose ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();

  if (!row) throw new Error('Failed to insert job channel');
  return row;
}

export async function listJobChannels(organizationId: string): Promise<JobChannel[]> {
  const db = getDb();
  return db
    .select()
    .from(jobChannels)
    .where(eq(jobChannels.organizationId, organizationId))
    .orderBy(desc(jobChannels.createdAt));
}

export async function getJobChannel(
  organizationId: string,
  channelId: string,
): Promise<JobChannel | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(jobChannels)
    .where(and(eq(jobChannels.organizationId, organizationId), eq(jobChannels.id, channelId)));
  return row ?? null;
}

export async function updateJobChannel(
  organizationId: string,
  channelId: string,
  patch: Partial<Pick<JobChannel, 'name' | 'purpose' | 'status'>>,
): Promise<JobChannel | null> {
  const db = getDb();
  const [row] = await db
    .update(jobChannels)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(jobChannels.organizationId, organizationId), eq(jobChannels.id, channelId)))
    .returning();
  return row ?? null;
}
