import { requireMembership } from '@yougrep/auth';
import {
  composioUserId,
  getComposioClient,
  TIER1_TOOLKITS,
} from '@yougrep/integrations';
import { currentOrgSession } from '../../../../lib/session';
import { errorResponse, json } from '../../../../lib/http';

export const runtime = 'nodejs';

/**
 * List the org's connector status, one row per tier-1 toolkit, so the workspace
 * can render Connect / Connected affordances. Reads live from Composio.
 */
export async function GET(): Promise<Response> {
  try {
    const session = await currentOrgSession();
    if (!session) return json({ error: 'No active organization' }, 401);
    await requireMembership(session.userId, session.organizationId);

    const composio = getComposioClient();
    const connections = await composio.listConnections(
      composioUserId(session.organizationId),
      TIER1_TOOLKITS,
    );
    const byToolkit = new Map(connections.map((c) => [c.toolkit, c]));

    const toolkits = TIER1_TOOLKITS.map((toolkit) => {
      const conn = byToolkit.get(toolkit);
      return {
        toolkit,
        connected: conn?.status.toUpperCase() === 'ACTIVE',
        status: conn?.status ?? 'NOT_CONNECTED',
      };
    });

    return json({ toolkits });
  } catch (err) {
    return errorResponse(err);
  }
}
