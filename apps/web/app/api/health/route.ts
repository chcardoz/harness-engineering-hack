import { getDb, ensureMigrated, organization, count } from '@yougrep/db';

export const runtime = 'nodejs';

export async function GET() {
  await ensureMigrated();
  const db = getDb();
  const [row] = await db.select({ n: count() }).from(organization);
  return Response.json({ ok: true, organizations: row?.n ?? 0 });
}
