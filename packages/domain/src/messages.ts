import { getDb, channelMessages, eq, and, asc } from '@yougrep/db';

export type ChannelMessage = typeof channelMessages.$inferSelect;

export async function listChannelMessages(
  organizationId: string,
  jobChannelId: string,
): Promise<ChannelMessage[]> {
  const db = getDb();
  return db
    .select()
    .from(channelMessages)
    .where(
      and(
        eq(channelMessages.organizationId, organizationId),
        eq(channelMessages.jobChannelId, jobChannelId),
      ),
    )
    .orderBy(asc(channelMessages.createdAt));
}

export async function appendChannelMessage(input: {
  organizationId: string;
  jobChannelId: string;
  role: string;
  content: string;
  openui?: Record<string, unknown> | null;
  agentRunId?: string;
  createdByUserId?: string;
}): Promise<ChannelMessage> {
  const db = getDb();
  const [row] = await db
    .insert(channelMessages)
    .values({
      organizationId: input.organizationId,
      jobChannelId: input.jobChannelId,
      role: input.role,
      content: input.content,
      openui: input.openui ?? null,
      agentRunId: input.agentRunId ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to insert channel message');
  return row;
}
