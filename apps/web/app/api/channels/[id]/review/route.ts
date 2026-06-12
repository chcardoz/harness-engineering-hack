import { requireMembership } from '@yougrep/auth';
import {
  getJobChannel,
  listApplicationsForChannel,
  listCandidates,
  listResultPackagesForChannel,
} from '@yougrep/domain';
import { currentOrgSession } from '../../../../../lib/session';
import { errorResponse, json } from '../../../../../lib/http';

export const runtime = 'nodejs';

const STAGES = ['applied', 'interviewing', 'interviewed', 'shortlisted', 'rejected'] as const;

/** Live candidate review data for a channel: pipeline counts + scorecards. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const session = await currentOrgSession();
    if (!session) return json({ error: 'No active organization' }, 401);
    await requireMembership(session.userId, session.organizationId);

    const { id } = await ctx.params;
    const channel = await getJobChannel(session.organizationId, id);
    if (!channel) return json({ error: 'Channel not found' }, 404);

    const [packages, applications, candidates] = await Promise.all([
      listResultPackagesForChannel(session.organizationId, id),
      listApplicationsForChannel(session.organizationId, id),
      listCandidates(session.organizationId),
    ]);
    const nameById = new Map(candidates.map((c) => [c.id, c.name ?? c.email]));

    const pipeline = STAGES.map((stage) => ({
      stage,
      count: applications.filter((a) => a.stage === stage).length,
    }));

    const scorecards = [...packages]
      .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
      .map((p) => ({
        candidateId: p.candidateId,
        name: nameById.get(p.candidateId) ?? 'Candidate',
        overallScore: p.overallScore,
        recommendation: p.recommendation,
        summary: p.summary,
        strengths: p.strengths ?? [],
        concerns: p.concerns ?? [],
        rubricScores: p.rubricScores ?? [],
      }));

    return json({
      pipeline,
      scorecards,
      applicationCount: applications.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
