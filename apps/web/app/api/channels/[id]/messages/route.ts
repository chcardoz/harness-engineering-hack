import { requireMembership } from '@yougrep/auth';
import { appendChannelMessage, getJobChannel } from '@yougrep/domain';
import { runJobChannelAgent } from '@yougrep/agents';
import type { OpenUIAction } from '@yougrep/openui';
import { currentOrgSession } from '../../../../../lib/session';
import { errorResponse, json } from '../../../../../lib/http';

export const runtime = 'nodejs';

/**
 * Post a recruiter message (and/or an OpenUI action) to a channel and run one
 * turn of the channel agent. Returns the agent's reply turn.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const session = await currentOrgSession();
    if (!session) return json({ error: 'No active organization' }, 401);
    await requireMembership(session.userId, session.organizationId);

    const { id } = await ctx.params;
    const channel = await getJobChannel(session.organizationId, id);
    if (!channel) return json({ error: 'Channel not found' }, 404);

    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      action?: OpenUIAction;
    };
    const message = (body.message ?? '').trim();
    const action = body.action;

    if (!message && !action) return json({ error: 'Empty message' }, 400);

    // Persist the recruiter's message (a bare action gets a synthesized label).
    const display = message || actionLabel(action);
    await appendChannelMessage({
      organizationId: session.organizationId,
      jobChannelId: id,
      role: 'user',
      content: display,
      createdByUserId: session.userId,
    });

    const turn = await runJobChannelAgent({
      organizationId: session.organizationId,
      jobChannelId: id,
      userId: session.userId,
      message: message || actionLabel(action),
      action,
    });

    return json({ turn });
  } catch (err) {
    return errorResponse(err);
  }
}

function actionLabel(action?: OpenUIAction): string {
  if (!action) return '';
  if (action.actionId === 'publish' || action.actionId === 'confirm_publish') {
    return action.confirmed ? 'Confirm publish' : 'Publish';
  }
  return action.actionId.replace(/_/g, ' ');
}
