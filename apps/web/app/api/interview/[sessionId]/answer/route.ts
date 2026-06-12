import { ensureMigrated } from '@yougrep/db';
import { getInterviewSessionByCapability } from '@yougrep/domain';
import { submitInterviewAnswer } from '@yougrep/agents';
import type { OpenUIAction } from '@yougrep/openui/contract';
import { errorResponse, json } from '../../../../../lib/http';

export const runtime = 'nodejs';

/**
 * Submit one interview answer (or the consent action) and get the next step.
 * Public; the session id is the capability.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  try {
    await ensureMigrated();
    const { sessionId } = await ctx.params;
    const session = await getInterviewSessionByCapability(sessionId);
    if (!session) return json({ error: 'Interview not found' }, 404);

    const body = (await req.json().catch(() => ({}))) as { action?: OpenUIAction };
    if (!body.action) return json({ error: 'Missing action' }, 400);

    const step = await submitInterviewAnswer(session.organizationId, sessionId, body.action);
    return json({ step });
  } catch (err) {
    return errorResponse(err);
  }
}
