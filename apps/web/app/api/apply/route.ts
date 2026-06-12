import {
  createApplication,
  createInterviewSession,
  getPlanForChannel,
  getPublishedPosting,
  upsertCandidate,
} from '@yougrep/domain';
import { ensureMigrated } from '@yougrep/db';
import { errorResponse, json } from '../../../lib/http';

export const runtime = 'nodejs';

/**
 * Public candidate apply endpoint. Given a published posting (org slug + job
 * slug) and an email, create the candidate, application, and an interview
 * session, then return the session id (the capability the candidate uses to
 * run the interview). No auth — the candidate is anonymous.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    await ensureMigrated();
    const body = (await req.json().catch(() => ({}))) as {
      orgSlug?: string;
      jobSlug?: string;
      email?: string;
      name?: string;
    };

    const orgSlug = (body.orgSlug ?? '').trim();
    const jobSlug = (body.jobSlug ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const name = (body.name ?? '').trim() || null;

    if (!orgSlug || !jobSlug) return json({ error: 'Missing posting' }, 400);
    if (!email || !email.includes('@')) return json({ error: 'A valid email is required' }, 400);

    const found = await getPublishedPosting(orgSlug, jobSlug);
    if (!found) return json({ error: 'Posting not found' }, 404);
    const { org, posting } = found;
    if (!posting.jobChannelId) return json({ error: 'Posting is not open for applications' }, 409);

    const candidate = await upsertCandidate({ organizationId: org.id, email, name });
    const application = await createApplication({
      organizationId: org.id,
      candidateId: candidate.id,
      jobChannelId: posting.jobChannelId,
      postingId: posting.id,
    });

    const plan = await getPlanForChannel(org.id, posting.jobChannelId);
    const interviewSession = await createInterviewSession({
      organizationId: org.id,
      applicationId: application.id,
      candidateId: candidate.id,
      jobChannelId: posting.jobChannelId,
      planId: plan?.id ?? null,
      mode: 'text',
    });

    return json({ sessionId: interviewSession.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
