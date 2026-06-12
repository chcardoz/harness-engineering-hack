import { requireMembership } from '@yougrep/auth';
import { upsertConnector } from '@yougrep/domain';
import {
  composioUserId,
  getComposioClient,
  TIER1_TOOLKITS,
  type ComposioToolkit,
} from '@yougrep/integrations';
import { NextResponse } from 'next/server';
import { createLogger } from '@yougrep/logger';
import { currentOrgSession } from '../../../../lib/session';

export const runtime = 'nodejs';

const log = createLogger('web:api:composio:callback');

/**
 * OAuth return target. Composio redirects the recruiter's browser here after
 * they authorize a toolkit. We re-read the org's live connections from Composio
 * and reconcile `connector_accounts` so the workspace reflects reality, then
 * send the user back into the app.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const backTo = new URL('/app', url.origin);

  const session = await currentOrgSession();
  if (!session) {
    // Lost the session on the round-trip — send them to sign in.
    return NextResponse.redirect(new URL('/sign-in', url.origin));
  }
  await requireMembership(session.userId, session.organizationId);

  try {
    const composio = getComposioClient();
    const connections = await composio.listConnections(
      composioUserId(session.organizationId),
      TIER1_TOOLKITS,
    );

    // Reconcile every tier-1 connection's status into the DB.
    const byToolkit = new Map(connections.map((c) => [c.toolkit, c]));
    for (const toolkit of TIER1_TOOLKITS) {
      const conn = byToolkit.get(toolkit);
      if (!conn) continue;
      await upsertConnector({
        organizationId: session.organizationId,
        provider: toolkit as ComposioToolkit,
        status: conn.status.toUpperCase() === 'ACTIVE' ? 'connected' : 'syncing',
        externalRef: conn.id,
        createdByUserId: session.userId,
      });
    }
    log.info('connections reconciled', {
      organizationId: session.organizationId,
      toolkit: url.searchParams.get('toolkit'),
      connections: connections.length,
    });
  } catch (err) {
    // Connection sync is best-effort; the user still lands back in the app.
    log.error('connection sync failed', { organizationId: session.organizationId, err });
  }

  backTo.searchParams.set('connected', url.searchParams.get('toolkit') ?? '1');
  return NextResponse.redirect(backTo);
}
