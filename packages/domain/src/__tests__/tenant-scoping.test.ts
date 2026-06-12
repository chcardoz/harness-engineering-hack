/**
 * Tenant-scoping tests for @yougrep/domain.
 *
 * Verifies that every domain read function is strictly scoped by organizationId
 * and never leaks rows across tenant boundaries.
 *
 * Also tests slug uniqueness suffixing for job channels and job board postings.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, ensureMigrated, organization } from '@yougrep/db';
import { createJobChannel, listJobChannels, getJobChannel } from '../jobs';
import { appendChannelMessage, listChannelMessages } from '../messages';
import { upsertJobListing, getListingForChannel } from '../listings';
import {
  publishPosting,
  listOrgPostings,
  listPublishedPostingsByOrgSlug,
  getPublishedPosting,
} from '../postings';
import { upsertCandidate, listCandidates, getCandidate } from '../candidates';
import { createApplication, listApplicationsForChannel, getApplication } from '../applications';
import {
  saveInterviewPlan,
  getPlanForChannel,
  createInterviewSession,
  getInterviewSession,
  appendInterviewTurn,
  listInterviewTurns,
  saveResultPackage,
  listResultPackagesForChannel,
  getResultPackageForSession,
} from '../interviews';
import { upsertConnector, listConnectors } from '../connectors';

// ──────────────────────────────────────────────────────────────────────────────
// Setup: two orgs inserted directly — mimics how Better Auth creates orgs.
// ──────────────────────────────────────────────────────────────────────────────

let orgAId: string;
let orgBId: string;
const orgASlug = `org-a-${crypto.randomUUID()}`;
const orgBSlug = `org-b-${crypto.randomUUID()}`;

beforeAll(async () => {
  await ensureMigrated();

  const db = getDb();

  const [orgA] = await db
    .insert(organization)
    .values({ name: 'Org Alpha', slug: orgASlug })
    .returning();
  const [orgB] = await db
    .insert(organization)
    .values({ name: 'Org Beta', slug: orgBSlug })
    .returning();

  if (!orgA || !orgB) throw new Error('Failed to seed orgs');
  orgAId = orgA.id;
  orgBId = orgB.id;
});

// ──────────────────────────────────────────────────────────────────────────────
// Job channels
// ──────────────────────────────────────────────────────────────────────────────

describe('jobs — tenant scoping', () => {
  it('listJobChannels returns only channels for the queried org', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Backend Eng' });
    await createJobChannel({ organizationId: orgBId, name: 'Frontend Eng' });

    const listA = await listJobChannels(orgAId);
    expect(listA.every((c) => c.organizationId === orgAId)).toBe(true);
    expect(listA.some((c) => c.id === chA.id)).toBe(true);
  });

  it('getJobChannel returns null when called with the wrong org', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Design Role' });
    const result = await getJobChannel(orgBId, chA.id);
    expect(result).toBeNull();
  });
});

describe('jobs — slug uniqueness suffixing', () => {
  it('suffixes -2, -3 when the slug already exists in the same org', async () => {
    const orgId = orgAId;
    const ch1 = await createJobChannel({ organizationId: orgId, name: 'Unique Job' });
    const ch2 = await createJobChannel({ organizationId: orgId, name: 'Unique Job' });
    const ch3 = await createJobChannel({ organizationId: orgId, name: 'Unique Job' });

    expect(ch1.slug).toBe('unique-job');
    expect(ch2.slug).toBe('unique-job-2');
    expect(ch3.slug).toBe('unique-job-3');
  });

  it('allows the same slug in different orgs', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Shared Name' });
    const chB = await createJobChannel({ organizationId: orgBId, name: 'Shared Name' });
    expect(chA.slug).toBe(chB.slug);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Channel messages
// ──────────────────────────────────────────────────────────────────────────────

describe('messages — tenant scoping', () => {
  it('listChannelMessages only returns messages for the correct org+channel', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Msg Test A' });
    const chB = await createJobChannel({ organizationId: orgBId, name: 'Msg Test B' });

    await appendChannelMessage({
      organizationId: orgAId,
      jobChannelId: chA.id,
      role: 'user',
      content: 'hello from A',
    });
    await appendChannelMessage({
      organizationId: orgBId,
      jobChannelId: chB.id,
      role: 'user',
      content: 'hello from B',
    });

    const msgsA = await listChannelMessages(orgAId, chA.id);
    expect(msgsA.every((m) => m.organizationId === orgAId)).toBe(true);
    expect(msgsA.every((m) => m.jobChannelId === chA.id)).toBe(true);
    expect(msgsA.some((m) => m.content === 'hello from A')).toBe(true);
    expect(msgsA.some((m) => m.content === 'hello from B')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Job listings
// ──────────────────────────────────────────────────────────────────────────────

describe('listings — tenant scoping', () => {
  it('getListingForChannel returns null when called with wrong org', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Listing Role' });
    await upsertJobListing({
      organizationId: orgAId,
      jobChannelId: chA.id,
      title: 'Senior Dev',
    });

    // Org B querying Org A's channel should return null.
    const result = await getListingForChannel(orgBId, chA.id);
    expect(result).toBeNull();
  });

  it('upsertJobListing is idempotent — updates the same row on second call', async () => {
    const ch = await createJobChannel({ organizationId: orgAId, name: 'Upsert Role' });
    const l1 = await upsertJobListing({
      organizationId: orgAId,
      jobChannelId: ch.id,
      title: 'Rev 1',
    });
    const l2 = await upsertJobListing({
      organizationId: orgAId,
      jobChannelId: ch.id,
      title: 'Rev 2',
    });
    expect(l1.id).toBe(l2.id);
    expect(l2.title).toBe('Rev 2');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Job board postings
// ──────────────────────────────────────────────────────────────────────────────

describe('postings — tenant scoping', () => {
  it('listOrgPostings only returns postings for the queried org', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Posting Role A' });
    const chB = await createJobChannel({ organizationId: orgBId, name: 'Posting Role B' });
    const now = new Date();

    await publishPosting({
      organizationId: orgAId,
      jobChannelId: chA.id,
      listing: { title: 'Role A' },
      now,
    });
    await publishPosting({
      organizationId: orgBId,
      jobChannelId: chB.id,
      listing: { title: 'Role B' },
      now,
    });

    const postingsA = await listOrgPostings(orgAId);
    expect(postingsA.every((p) => p.organizationId === orgAId)).toBe(true);
    expect(postingsA.some((p) => p.title === 'Role A')).toBe(true);
    expect(postingsA.some((p) => p.title === 'Role B')).toBe(false);
  });

  it('listPublishedPostingsByOrgSlug returns null for unknown slug', async () => {
    const result = await listPublishedPostingsByOrgSlug('no-such-org-ever');
    expect(result).toBeNull();
  });

  it('listPublishedPostingsByOrgSlug resolves org by slug and returns its published postings', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Public Role' });
    const now = new Date();
    await publishPosting({
      organizationId: orgAId,
      jobChannelId: chA.id,
      listing: { title: 'Public Role' },
      now,
    });

    const result = await listPublishedPostingsByOrgSlug(orgASlug);
    expect(result).not.toBeNull();
    expect(result!.org.id).toBe(orgAId);
    expect(result!.postings.every((p) => p.status === 'published')).toBe(true);
  });

  it('getPublishedPosting returns null when posting belongs to a different org', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Private Role' });
    const now = new Date();
    const posting = await publishPosting({
      organizationId: orgAId,
      jobChannelId: chA.id,
      listing: { title: 'Private Role' },
      now,
    });

    // Correct org slug + correct job slug → should work
    const found = await getPublishedPosting(orgASlug, posting.slug);
    expect(found).not.toBeNull();
    expect(found!.posting.id).toBe(posting.id);

    // Wrong org slug → should return null
    const notFound = await getPublishedPosting(orgBSlug, posting.slug);
    expect(notFound).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Candidates
// ──────────────────────────────────────────────────────────────────────────────

describe('candidates — tenant scoping', () => {
  it('listCandidates returns only candidates for the queried org', async () => {
    const email = `cand-${crypto.randomUUID()}@example.com`;
    await upsertCandidate({ organizationId: orgAId, email });
    await upsertCandidate({ organizationId: orgBId, email }); // same email, different org

    const listA = await listCandidates(orgAId);
    expect(listA.every((c) => c.organizationId === orgAId)).toBe(true);
  });

  it('getCandidate returns null when called with the wrong org', async () => {
    const email = `cand-scope-${crypto.randomUUID()}@example.com`;
    const c = await upsertCandidate({ organizationId: orgAId, email });
    const result = await getCandidate(orgBId, c.id);
    expect(result).toBeNull();
  });

  it('upsertCandidate is idempotent per org+email', async () => {
    const email = `idem-${crypto.randomUUID()}@example.com`;
    const c1 = await upsertCandidate({ organizationId: orgAId, email, name: 'Alice' });
    const c2 = await upsertCandidate({ organizationId: orgAId, email, name: 'Alice Updated' });
    expect(c1.id).toBe(c2.id);
    expect(c2.name).toBe('Alice Updated');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Applications
// ──────────────────────────────────────────────────────────────────────────────

describe('applications — tenant scoping', () => {
  it('listApplicationsForChannel does not return rows from another org', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'App Test Channel A' });
    const chB = await createJobChannel({ organizationId: orgBId, name: 'App Test Channel B' });
    const candA = await upsertCandidate({
      organizationId: orgAId,
      email: `appl-a-${crypto.randomUUID()}@x.com`,
    });
    const candB = await upsertCandidate({
      organizationId: orgBId,
      email: `appl-b-${crypto.randomUUID()}@x.com`,
    });

    await createApplication({
      organizationId: orgAId,
      candidateId: candA.id,
      jobChannelId: chA.id,
    });
    await createApplication({
      organizationId: orgBId,
      candidateId: candB.id,
      jobChannelId: chB.id,
    });

    const appsA = await listApplicationsForChannel(orgAId, chA.id);
    expect(appsA.every((a) => a.organizationId === orgAId)).toBe(true);
    expect(appsA.every((a) => a.jobChannelId === chA.id)).toBe(true);
  });

  it('getApplication returns null with wrong org', async () => {
    const ch = await createJobChannel({ organizationId: orgAId, name: 'Get App Scope' });
    const cand = await upsertCandidate({
      organizationId: orgAId,
      email: `get-app-${crypto.randomUUID()}@x.com`,
    });
    const app = await createApplication({
      organizationId: orgAId,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });
    const result = await getApplication(orgBId, app.id);
    expect(result).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Interviews
// ──────────────────────────────────────────────────────────────────────────────

describe('interviews — tenant scoping', () => {
  it('getPlanForChannel returns null with wrong org', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Plan Test Channel' });
    await saveInterviewPlan({
      organizationId: orgAId,
      jobChannelId: chA.id,
      roleBrief: 'Be great.',
    });
    const result = await getPlanForChannel(orgBId, chA.id);
    expect(result).toBeNull();
  });

  it('getInterviewSession returns null with wrong org', async () => {
    const ch = await createJobChannel({ organizationId: orgAId, name: 'Session Scope Channel' });
    const cand = await upsertCandidate({
      organizationId: orgAId,
      email: `sess-scope-${crypto.randomUUID()}@x.com`,
    });
    const app = await createApplication({
      organizationId: orgAId,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });
    const sess = await createInterviewSession({
      organizationId: orgAId,
      applicationId: app.id,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });
    const result = await getInterviewSession(orgBId, sess.id);
    expect(result).toBeNull();
  });

  it('listInterviewTurns only returns turns for the correct org+session', async () => {
    const ch = await createJobChannel({ organizationId: orgAId, name: 'Turns Channel' });
    const cand = await upsertCandidate({
      organizationId: orgAId,
      email: `turns-${crypto.randomUUID()}@x.com`,
    });
    const app = await createApplication({
      organizationId: orgAId,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });
    const sess = await createInterviewSession({
      organizationId: orgAId,
      applicationId: app.id,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });
    await appendInterviewTurn({
      organizationId: orgAId,
      sessionId: sess.id,
      role: 'agent',
      content: 'Hi!',
    });

    const turns = await listInterviewTurns(orgAId, sess.id);
    expect(turns.length).toBeGreaterThanOrEqual(1);
    expect(turns.every((t) => t.organizationId === orgAId)).toBe(true);
    expect(turns.every((t) => t.sessionId === sess.id)).toBe(true);

    // Wrong org gets empty list.
    const turnsWrong = await listInterviewTurns(orgBId, sess.id);
    expect(turnsWrong).toHaveLength(0);
  });

  it('getResultPackageForSession returns null with wrong org', async () => {
    const ch = await createJobChannel({ organizationId: orgAId, name: 'Result Scope Channel' });
    const cand = await upsertCandidate({
      organizationId: orgAId,
      email: `res-scope-${crypto.randomUUID()}@x.com`,
    });
    const app = await createApplication({
      organizationId: orgAId,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });
    const sess = await createInterviewSession({
      organizationId: orgAId,
      applicationId: app.id,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });
    await saveResultPackage({
      organizationId: orgAId,
      sessionId: sess.id,
      applicationId: app.id,
      candidateId: cand.id,
      jobChannelId: ch.id,
    });

    const result = await getResultPackageForSession(orgBId, sess.id);
    expect(result).toBeNull();
  });

  it('listResultPackagesForChannel only returns results for the queried org+channel', async () => {
    const chA = await createJobChannel({ organizationId: orgAId, name: 'Results Channel A' });
    const chB = await createJobChannel({ organizationId: orgBId, name: 'Results Channel B' });
    const candA = await upsertCandidate({
      organizationId: orgAId,
      email: `res-a-${crypto.randomUUID()}@x.com`,
    });
    const candB = await upsertCandidate({
      organizationId: orgBId,
      email: `res-b-${crypto.randomUUID()}@x.com`,
    });
    const appA = await createApplication({
      organizationId: orgAId,
      candidateId: candA.id,
      jobChannelId: chA.id,
    });
    const appB = await createApplication({
      organizationId: orgBId,
      candidateId: candB.id,
      jobChannelId: chB.id,
    });
    const sessA = await createInterviewSession({
      organizationId: orgAId,
      applicationId: appA.id,
      candidateId: candA.id,
      jobChannelId: chA.id,
    });
    const sessB = await createInterviewSession({
      organizationId: orgBId,
      applicationId: appB.id,
      candidateId: candB.id,
      jobChannelId: chB.id,
    });

    await saveResultPackage({
      organizationId: orgAId,
      sessionId: sessA.id,
      applicationId: appA.id,
      candidateId: candA.id,
      jobChannelId: chA.id,
    });
    await saveResultPackage({
      organizationId: orgBId,
      sessionId: sessB.id,
      applicationId: appB.id,
      candidateId: candB.id,
      jobChannelId: chB.id,
    });

    const resultsA = await listResultPackagesForChannel(orgAId, chA.id);
    expect(resultsA.every((r) => r.organizationId === orgAId)).toBe(true);
    expect(resultsA.every((r) => r.jobChannelId === chA.id)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Connectors
// ──────────────────────────────────────────────────────────────────────────────

describe('connectors — tenant scoping', () => {
  it('listConnectors only returns connectors for the queried org', async () => {
    await upsertConnector({ organizationId: orgAId, provider: 'notion' });
    await upsertConnector({ organizationId: orgBId, provider: 'github' });

    const connsA = await listConnectors(orgAId);
    expect(connsA.every((c) => c.organizationId === orgAId)).toBe(true);
    expect(connsA.some((c) => c.provider === 'notion')).toBe(true);
    // Org A should NOT have org B's github connector.
    const githubInA = connsA.filter((c) => c.provider === 'github' && c.organizationId !== orgAId);
    expect(githubInA).toHaveLength(0);
  });
});
