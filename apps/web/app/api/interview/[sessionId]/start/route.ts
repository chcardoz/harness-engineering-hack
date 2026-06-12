import { ensureMigrated } from '@yougrep/db';
import { getInterviewSessionByCapability } from '@yougrep/domain';
import { startInterviewSession } from '@yougrep/agents';
import { errorResponse, json } from '../../../../../lib/http';

export const runtime = 'nodejs';

/**
 * Begin the interview for a session (public; the session id is the capability).
 * Returns the consent screen as OpenUI.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  try {
    await ensureMigrated();
    const { sessionId } = await ctx.params;
    const session = await getInterviewSessionByCapability(sessionId);
    if (!session) return json({ error: 'Interview not found' }, 404);

    const step = await startInterviewSession(session.organizationId, sessionId);
    return json({ step });
  } catch (err) {
    return errorResponse(err);
  }
}
