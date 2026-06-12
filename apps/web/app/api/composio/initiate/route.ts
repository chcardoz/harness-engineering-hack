import { requireMembership } from '@yougrep/auth';
import { upsertConnector } from '@yougrep/domain';
import {
  composioUserId,
  getComposioClient,
  TIER1_TOOLKITS,
  type ComposioToolkit,
} from '@yougrep/integrations';
import { createLogger } from '@yougrep/logger';
import { currentOrgSession } from '../../../../lib/session';
import { errorResponse, json } from '../../../../lib/http';

export const runtime = 'nodejs';

const log = createLogger('web:api:composio:initiate');

/**
 * Begin an OAuth connection for one of the org's connectors. Returns a Composio
 * redirect URL; the browser sends the recruiter there to authorize their own
 * GitHub/Notion/Linear, and Composio bounces back to /api/composio/callback.
 *
 * Connections are ORG-scoped (Composio user id = `org_{organizationId}`), so an
 * admin connects the company account once for the whole workspace.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const session = await currentOrgSession();
    if (!session) return json({ error: 'No active organization' }, 401);
    await requireMembership(session.userId, session.organizationId);

    const body = (await req.json().catch(() => ({}))) as { toolkit?: string };
    const toolkit = body.toolkit as ComposioToolkit | undefined;
    if (!toolkit || !TIER1_TOOLKITS.includes(toolkit)) {
      return json({ error: `Unsupported toolkit "${body.toolkit ?? ''}"` }, 400);
    }

    const origin = new URL(req.url).origin;
    const composio = getComposioClient();
    const { redirectUrl, connectionId } = await composio.initiateConnection({
      userId: composioUserId(session.organizationId),
      toolkit,
      callbackUrl: `${origin}/api/composio/callback?toolkit=${toolkit}`,
    });

    // Record the in-flight connection so the workspace shows it as connecting.
    await upsertConnector({
      organizationId: session.organizationId,
      provider: toolkit,
      status: 'syncing',
      externalRef: connectionId,
      createdByUserId: session.userId,
    });

    log.info('connection initiated', {
      organizationId: session.organizationId,
      toolkit,
      connectionId,
    });
    return json({ redirectUrl });
  } catch (err) {
    return errorResponse(err);
  }
}
