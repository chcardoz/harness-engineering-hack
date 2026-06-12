import { getDb, connectorAccounts, eq, and, asc } from '@yougrep/db';

export type ConnectorAccount = typeof connectorAccounts.$inferSelect;

export async function listConnectors(organizationId: string): Promise<ConnectorAccount[]> {
  const db = getDb();
  return db
    .select()
    .from(connectorAccounts)
    .where(eq(connectorAccounts.organizationId, organizationId))
    .orderBy(asc(connectorAccounts.createdAt));
}

export async function upsertConnector(input: {
  organizationId: string;
  provider: string;
  status?: string;
  metadata?: Record<string, unknown> | null;
  externalRef?: string | null;
  createdByUserId?: string | null;
}): Promise<ConnectorAccount> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(connectorAccounts)
    .where(
      and(
        eq(connectorAccounts.organizationId, input.organizationId),
        eq(connectorAccounts.provider, input.provider),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(connectorAccounts)
      .set({
        status: input.status ?? existing.status,
        metadata: input.metadata ?? existing.metadata,
        externalRef: input.externalRef ?? existing.externalRef,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(connectorAccounts.organizationId, input.organizationId),
          eq(connectorAccounts.id, existing.id),
        ),
      )
      .returning();
    if (!updated) throw new Error('Failed to update connector');
    return updated;
  }

  const [row] = await db
    .insert(connectorAccounts)
    .values({
      organizationId: input.organizationId,
      provider: input.provider,
      status: input.status ?? 'connected',
      metadata: input.metadata ?? null,
      externalRef: input.externalRef ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to insert connector');
  return row;
}
