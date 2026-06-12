/**
 * Demo seed for the Yougrep recruiter workspace.
 *
 * From a fresh database (`pnpm --filter @yougrep/db reset`), this populates a
 * complete, login-ready demo so the recruiter workspace and the review sidebar
 * are fully populated on first login — no manual browser walkthrough required.
 *
 * Run with: `pnpm --filter @yougrep/db seed`
 *
 * What it creates (all scoped to ONE organization — tenant boundary honored):
 *   1. A recruiter user + an organization the recruiter belongs to.
 *   2. The three demo read-only connectors (notion / github / slack), mirroring
 *      apps/web/app/api/channels/route.ts DEMO_CONNECTORS.
 *   3. A "Senior Postgres Engineer" job channel.
 *   4. A published job-board posting (driven through the real publish path of
 *      the job-channel agent, which also persists the interview plan).
 *   5. Three candidates, each having completed a full text interview via the
 *      interview agent, with deliberately different answer quality so their
 *      scorecards span Strong yes / Maybe / weaker.
 *
 * ── Auth path (documented per task requirements) ──────────────────────────
 * The recruiter USER is created via `auth.api.signUpEmail({ body: ... })` so
 * Better Auth produces a valid password hash (autoSignIn is on) and the
 * recruiter can log in afterward. We do NOT hand-roll password hashing.
 *
 * The ORGANIZATION + membership are created via a DIRECT DRIZZLE INSERT rather
 * than `auth.api.createOrganization`. Reason: `createOrganization` requires an
 * authenticated request context (session headers), which is awkward to thread
 * through a standalone Node script. A direct insert of the `organization` +
 * `member` rows (reusing the user id from signUpEmail) is the reliable,
 * explicitly-sanctioned fallback. The recruiter is added as an `owner` member,
 * which is exactly what the app's membership checks look for.
 */
import { getEnv, slugify } from '@yougrep/config';
import { auth } from '@yougrep/auth';
import {
  createApplication,
  createInterviewSession,
  createJobChannel,
  getResultPackageForSession,
  upsertCandidate,
  upsertConnector,
  type Candidate,
} from '@yougrep/domain';
import { runJobChannelAgent, startInterviewSession, submitInterviewAnswer } from '@yougrep/agents';
import type { OpenUIAction } from '@yougrep/openui/contract';
import { ensureMigrated, getDb, organization, member, user, eq } from '../index';

/* ── Demo constants ──────────────────────────────────────────────────────── */

const RECRUITER = {
  email: 'demo@yougrep.dev',
  password: 'yougrep-demo-1234',
  name: 'Dana Recruiter',
};

const ORG_NAME = 'Northwind Data';
const ORG_SLUG = slugify(ORG_NAME); // → 'northwind-data'

// Mirrors apps/web/app/api/channels/route.ts DEMO_CONNECTORS.
const DEMO_CONNECTORS = ['notion', 'github', 'slack'] as const;

const CHANNEL_NAME = 'Senior Postgres Engineer';

/* ── Candidate answer sets (drive score spread) ──────────────────────────────
 *
 * Scoring (packages/agents/src/scoring.ts) blends two deterministic signals:
 *   - substance: word count (≥8 → 2, ≥25 → 3, ≥60 → 4)
 *   - coverage:  hits against the criterion's SIGNAL_TERMS (≥1 → +1, ≥3 → +2)
 * Self-rating questions score the (clamped) number directly.
 *
 * The persisted Postgres question plan (packages/agents/src/rubric.ts) is, in
 * order: self_rating, q_mvcc (pg_internals), q_sql (query_perf),
 * q_replication (replication), q_incident (operations).
 *
 * Each candidate answers in that order. We craft long, term-dense answers for
 * the strong candidate, mid-length partial-coverage answers for the maybe, and
 * short, term-sparse answers for the weak one.
 */

interface CandidateSpec {
  email: string;
  name: string;
  headline: string;
  tier: string; // intended recommendation tier (for the summary log)
  /** Answers in question-plan order: [self_rating, mvcc, sql, replication, incident]. */
  answers: unknown[];
}

const CANDIDATES: CandidateSpec[] = [
  {
    email: 'priya.menon@example.com',
    name: 'Priya Menon',
    headline: 'Staff Database Engineer · 9 yrs Postgres',
    tier: 'Strong yes',
    answers: [
      5,
      // pg_internals — dense with mvcc/vacuum/tuple/wal/visibility/bloat/autovacuum/xid
      'MVCC gives every transaction a consistent snapshot by keeping multiple row versions ' +
        '(tuples) tagged with xmin/xmax xid values; visibility is decided against that snapshot. ' +
        'A long-running transaction holds back the xid horizon, so autovacuum cannot reclaim dead ' +
        'tuples that are still potentially visible to it. The operational consequence is table and ' +
        'index bloat plus rising WAL, and in the worst case transaction-id wraparound risk. We ' +
        'monitor the oldest xid, keep vacuum aggressive on hot tables, and alert when a transaction ' +
        'or replication slot pins the visibility horizon for too long.',
      // query_perf — index/explain/analyze/partial/btree
      'I would EXPLAIN ANALYZE it first to confirm a seq scan on the 50M-row table. The fix is a ' +
        'partial btree index on (created_at) WHERE processed = false, which matches the queue ' +
        'predicate exactly and stays tiny as rows are processed. The query then becomes an index ' +
        'scan returning the first 100 ordered rows with no sort. I would also add SKIP LOCKED for ' +
        'safe concurrent draining and re-check the plan after analyze.',
      // replication — replica/wal/streaming/logical/lag/batch/pitr/recovery
      'The bulk DELETE generated a huge burst of WAL; the streaming replica had to replay it ' +
        'serially and fell behind, so replication lag spiked to 12 minutes. To prevent it I batch ' +
        'large deletes into small chunks with short transactions so WAL is paced, watch replica ' +
        'lag and WAL generation, and keep PITR/recovery tested. For logical replication I would ' +
        'also size the apply workers and avoid one giant transaction.',
      // operations — incident/on-call/monitor/alert/postmortem/mitigat/rollback/timeout
      'On-call, I was paged when an alert fired on connection saturation during an incident. I ' +
        'mitigated by lowering statement_timeout and shedding a runaway batch job, then rolled back ' +
        'the offending deploy. The durable fix was PgBouncer in transaction mode plus a monitor on ' +
        'pool wait time; I wrote the postmortem and we added the alert that would have caught it ' +
        'earlier.',
    ],
  },
  {
    email: 'marcus.lee@example.com',
    name: 'Marcus Lee',
    headline: 'Backend Engineer · some Postgres ops',
    tier: 'Maybe — needs follow-up',
    answers: [
      3,
      // pg_internals — short, hits ONE term (mvcc); substance 2 + coverage 1 → 3.
      'MVCC means Postgres keeps older row versions so reads and writes do not block each other much.',
      // query_perf — short, hits ONE term (index); substance 2 + coverage 1 → 3.
      'I would add an index on the columns we filter on so the query is faster.',
      // replication — short, NO signal terms (avoids replica/lag/batch); substance 2 + coverage 0 → 2.
      'The big delete made the other database fall behind, so I would split the delete into smaller pieces.',
      // operations — short, NO signal terms (avoids alert/rollback/incident); substance 2 + coverage 0 → 2.
      'The database got slow one day, so we reverted the recent change and it recovered after that.',
    ],
  },
  {
    email: 'sofia.alvarez@example.com',
    name: 'Sofia Alvarez',
    headline: 'Junior Developer · learning databases',
    tier: 'No',
    answers: [
      2,
      // pg_internals — short, no signal terms
      'It is about how Postgres handles different versions of data so people do not conflict.',
      // query_perf — short, no real signal
      'I would make the query faster, maybe cache the results or only get what we need.',
      // replication — short, no terms
      'The delete was too big so the copy got slow. I would make the delete smaller.',
      // operations — short, no terms
      'Something broke and we fixed it and moved on.',
    ],
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Build the OpenUIAction the interview agent expects for an answer value. */
function answerAction(value: unknown): OpenUIAction {
  return {
    actionId: 'answer',
    // Component is required by the type; the interview agent only reads `value`.
    component: 'QuestionCard',
    value,
  };
}

/** Consent action (the agent only checks consentRecordedAt, not the payload). */
function consentAction(): OpenUIAction {
  return { actionId: 'consent', component: 'ConsentNotice', confirmed: true };
}

/**
 * Drive a single candidate end to end: create the candidate + application +
 * interview session, then walk the interview agent from consent through every
 * question. Reaching the last answer auto-finalizes the result package.
 */
async function runCandidate(
  organizationId: string,
  jobChannelId: string,
  spec: CandidateSpec,
): Promise<{ candidate: Candidate; overall: number | null; recommendation: string | null }> {
  const candidate = await upsertCandidate({
    organizationId,
    email: spec.email,
    name: spec.name,
    headline: spec.headline,
  });

  const application = await createApplication({
    organizationId,
    candidateId: candidate.id,
    jobChannelId,
  });

  const session = await createInterviewSession({
    organizationId,
    applicationId: application.id,
    candidateId: candidate.id,
    jobChannelId,
    mode: 'text',
  });

  // 1. Present consent.
  await startInterviewSession(organizationId, session.id);
  // 2. Submit consent → returns the first question.
  let stepResult = await submitInterviewAnswer(organizationId, session.id, consentAction());

  // 3. Answer every question in plan order until the interview completes. We
  //    cap the loop defensively so a plan/answer mismatch can never spin.
  let i = 0;
  const maxTurns = spec.answers.length + 2;
  while (!stepResult.done && i < maxTurns) {
    const value = spec.answers[i] ?? 'No further comment.';
    stepResult = await submitInterviewAnswer(organizationId, session.id, answerAction(value));
    i++;
  }

  const pkg = await getResultPackageForSession(organizationId, session.id);
  return {
    candidate,
    overall: pkg?.overallScore ?? null,
    recommendation: pkg?.recommendation ?? null,
  };
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  getEnv();
  await ensureMigrated();
  const db = getDb();

  console.log('[db:seed] starting demo seed…');

  /* 1. Recruiter user (Better Auth → valid password hash). ──────────────── */
  let userId: string;
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, RECRUITER.email))
    .limit(1);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`[db:seed] recruiter ${RECRUITER.email} already exists — reusing.`);
  } else {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: RECRUITER.email,
          password: RECRUITER.password,
          name: RECRUITER.name,
        },
      });
      // signUpEmail returns { user, token }.
      userId = result.user.id;
      console.log(`[db:seed] created recruiter ${RECRUITER.email}.`);
    } catch (err) {
      // Defensive: if a race/duplicate slipped through, fall back to lookup.
      const [u] = await db.select().from(user).where(eq(user.email, RECRUITER.email)).limit(1);
      if (!u) throw err;
      userId = u.id;
      console.log('[db:seed] recruiter sign-up hit an existing record — reusing.');
    }
  }

  /* 2. Organization + owner membership (direct Drizzle insert — see header). */
  let organizationId: string;
  const [existingOrg] = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, ORG_SLUG))
    .limit(1);

  if (existingOrg) {
    organizationId = existingOrg.id;
    console.log(`[db:seed] org "${ORG_NAME}" (${ORG_SLUG}) already exists — reusing.`);
  } else {
    const [orgRow] = await db
      .insert(organization)
      .values({ name: ORG_NAME, slug: ORG_SLUG })
      .returning();
    if (!orgRow) throw new Error('Failed to insert organization');
    organizationId = orgRow.id;
    console.log(`[db:seed] created org "${ORG_NAME}" (${ORG_SLUG}).`);
  }

  // Ensure the recruiter is an owner member of the org.
  const [existingMember] = await db
    .select()
    .from(member)
    .where(eq(member.organizationId, organizationId))
    .limit(1);
  if (!existingMember) {
    await db.insert(member).values({ organizationId, userId, role: 'owner' });
    console.log('[db:seed] added recruiter as org owner.');
  }

  /* 3. Demo read-only connectors. ───────────────────────────────────────── */
  for (const provider of DEMO_CONNECTORS) {
    await upsertConnector({
      organizationId,
      provider,
      status: 'connected',
      createdByUserId: userId,
    });
  }
  console.log(`[db:seed] connectors connected: ${DEMO_CONNECTORS.join(', ')}.`);

  /* 4. Job channel. ─────────────────────────────────────────────────────── */
  const channel = await createJobChannel({
    organizationId,
    name: CHANNEL_NAME,
    purpose: 'Own the production Postgres fleet: replication, performance, reliability.',
    createdByUserId: userId,
  });
  console.log(`[db:seed] created channel "${channel.name}" (${channel.slug}).`);

  /* 5. Publish via the real agent path (also persists the interview plan). ─
   *    Driving the job-channel agent exercises the actual publish flow:
   *    overview → draft listing → confirmed publish. The confirmed publish
   *    handler upserts the listing, saves the interview plan, publishes the
   *    posting, and opens the channel. The Airbyte connector context is read
   *    via the stub fixtures (INTEGRATIONS_MODE=stub), which return the
   *    Postgres scenario, so distillJobBrief yields the rich Postgres brief and
   *    buildInterviewPlanDraft yields the 5-question Postgres rubric. */
  await runJobChannelAgent({
    organizationId,
    jobChannelId: channel.id,
    userId,
    message: `Set up the ${CHANNEL_NAME} channel and give me an overview.`,
  });
  await runJobChannelAgent({
    organizationId,
    jobChannelId: channel.id,
    userId,
    message: 'Draft the listing.',
    action: { actionId: 'draft_listing', component: 'NextActionButtons' },
  });
  await runJobChannelAgent({
    organizationId,
    jobChannelId: channel.id,
    userId,
    message: 'Publish it to the job board.',
    action: { actionId: 'publish', component: 'NextActionButtons', confirmed: true },
  });

  // The publish handler slugifies the listing title ("Senior Postgres
  // Engineer") → 'senior-postgres-engineer', so the public posting resolves at
  // /c/northwind-data/senior-postgres-engineer.
  const expectedJobSlug = slugify(CHANNEL_NAME);
  console.log(`[db:seed] published posting at /c/${ORG_SLUG}/${expectedJobSlug}.`);

  /* 6. Candidates with completed interviews (different score tiers). ─────── */
  const results: { name: string; tier: string; overall: number | null; rec: string | null }[] = [];
  for (const spec of CANDIDATES) {
    const r = await runCandidate(organizationId, channel.id, spec);
    results.push({
      name: spec.name,
      tier: spec.tier,
      overall: r.overall,
      rec: r.recommendation,
    });
    console.log(
      `[db:seed] interviewed ${spec.name}: overall=${r.overall ?? '?'} ` +
        `recommendation="${r.recommendation ?? '?'}" (intended: ${spec.tier}).`,
    );
  }

  /* ── Summary ───────────────────────────────────────────────────────────── */
  console.log('\n[db:seed] ✅ demo seed complete.');
  console.log('[db:seed] ──────────────────────────────────────────────');
  console.log(`[db:seed] org slug:        ${ORG_SLUG}`);
  console.log(`[db:seed] recruiter login: ${RECRUITER.email} / ${RECRUITER.password}`);
  console.log(`[db:seed] candidates:      ${results.length}`);
  for (const r of results) {
    console.log(
      `[db:seed]   - ${r.name}: ${r.overall ?? '?'}/100 "${r.rec ?? '?'}" ` +
        `(intended ${r.tier})`,
    );
  }
  console.log(`[db:seed] public board:    /c/${ORG_SLUG}`);
  console.log(`[db:seed] published role:  /c/${ORG_SLUG}/${expectedJobSlug}`);
  console.log('[db:seed] ──────────────────────────────────────────────');

  process.exit(0);
}

main().catch((err) => {
  console.error('[db:seed] failed', err);
  process.exit(1);
});
