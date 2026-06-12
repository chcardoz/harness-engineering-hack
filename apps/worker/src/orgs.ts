/**
 * Worker-internal organization enumeration.
 *
 * The reconciliation loop must sweep every known tenant, but @yougrep/domain
 * has no "list all organizations" function (the app's org lookups are always
 * by id or slug, since user-facing code already knows its tenant). The buildout
 * rules say not to add an untestable enumeration helper to the domain layer
 * from the worker, so we read the org list here.
 *
 * This is the ONE intentionally untenanted read in the worker: the organization
 * table is the registry of tenants itself, not tenant-scoped product data. Every
 * downstream product query the worker issues is still scoped by organization_id.
 */
import { getDb, organization } from '@yougrep/db';

export async function listAllOrganizationIds(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ id: organization.id }).from(organization);
  return rows.map((r) => r.id);
}
