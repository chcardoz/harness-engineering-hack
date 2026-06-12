import { getDb, organization, eq } from '@yougrep/db';

export type Organization = typeof organization.$inferSelect;

export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return row ?? null;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const db = getDb();
  const [row] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1);
  return row ?? null;
}
