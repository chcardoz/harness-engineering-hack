import { requireMembership } from '@yougrep/auth';
import {
  appendChannelMessage,
  createJobChannel,
  listConnectors,
  upsertConnector,
} from '@yougrep/domain';
import { runJobChannelAgent } from '@yougrep/agents';
import { currentOrgSession } from '../../../lib/session';
import { errorResponse, json } from '../../../lib/http';

export const runtime = 'nodejs';

const DEMO_CONNECTORS = ['notion', 'github', 'slack'] as const;

/**
 * Create a job channel. Seeds the org's read-only connectors on first use so
 * the channel agent immediately has context, then runs an opening agent turn.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const session = await currentOrgSession();
    if (!session) return json({ error: 'No active organization' }, 401);
    await requireMembership(session.userId, session.organizationId);

    const body = (await req.json().catch(() => ({}))) as { name?: string; purpose?: string };
    const name = (body.name ?? '').trim();
    if (!name) return json({ error: 'Channel name is required' }, 400);

    // Seed demo connectors once (idempotent upsert).
    const existing = await listConnectors(session.organizationId);
    if (existing.length === 0) {
      for (const provider of DEMO_CONNECTORS) {
        await upsertConnector({
          organizationId: session.organizationId,
          provider,
          status: 'connected',
          createdByUserId: session.userId,
        });
      }
    }

    const channel = await createJobChannel({
      organizationId: session.organizationId,
      name,
      purpose: body.purpose,
      createdByUserId: session.userId,
    });

    // Opening turn: the agent introduces the channel + distilled brief.
    await appendChannelMessage({
      organizationId: session.organizationId,
      jobChannelId: channel.id,
      role: 'user',
      content: `Set up the ${name} channel and give me an overview.`,
      createdByUserId: session.userId,
    });
    await runJobChannelAgent({
      organizationId: session.organizationId,
      jobChannelId: channel.id,
      userId: session.userId,
      message: `Set up the ${name} channel and give me an overview.`,
    });

    return json({ channel: { id: channel.id, name: channel.name, slug: channel.slug } }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
