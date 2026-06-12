import { pgTable, text, timestamp, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';

/** Random id used as the primary key for every row. */
const newId = () => crypto.randomUUID();

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

/* ────────────────────────────────────────────────────────────────────────
 * Better Auth tables (core + organization plugin).
 * Field (JS) names match Better Auth's model field names so the drizzle
 * adapter maps cleanly. Column names are snake_case.
 * ──────────────────────────────────────────────────────────────────────── */

export const user = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(newId),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey().$defaultFn(newId),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey().$defaultFn(newId),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey().$defaultFn(newId),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const organization = pgTable('organization', {
  id: text('id').primaryKey().$defaultFn(newId),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  metadata: text('metadata'),
  createdAt: createdAt(),
});

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: createdAt(),
  },
  (t) => [index('member_org_idx').on(t.organizationId), index('member_user_idx').on(t.userId)],
);

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey().$defaultFn(newId),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

/* ────────────────────────────────────────────────────────────────────────
 * Product tables — all tenant-scoped by organization_id.
 * ──────────────────────────────────────────────────────────────────────── */

/** Read-only connector accounts (Notion/GitHub/Slack/Greenhouse/Ashby via Airbyte). */
export const connectorAccounts = pgTable(
  'connector_accounts',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    status: text('status').notNull().default('connected'),
    externalRef: text('external_ref'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: text('created_by_user_id'),
  },
  (t) => [index('connector_org_idx').on(t.organizationId)],
);

/** One channel == one job opening. */
export const jobChannels = pgTable(
  'job_channels',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    purpose: text('purpose'),
    status: text('status').notNull().default('open'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: text('created_by_user_id'),
  },
  (t) => [index('channel_org_idx').on(t.organizationId)],
);

/** Messages in a job channel (recruiter + agent). */
export const channelMessages = pgTable(
  'channel_messages',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    jobChannelId: text('job_channel_id')
      .notNull()
      .references(() => jobChannels.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull().default(''),
    /** OpenUI-lang payload attached to an assistant message, if any. */
    openui: jsonb('openui').$type<Record<string, unknown> | null>(),
    agentRunId: text('agent_run_id'),
    createdAt: createdAt(),
    createdByUserId: text('created_by_user_id'),
  },
  (t) => [index('message_channel_idx').on(t.jobChannelId)],
);

/** Trace of an agent invocation (Guild run) + model metadata. */
export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    agentType: text('agent_type').notNull(), // 'job-channel' | 'interview'
    jobChannelId: text('job_channel_id'),
    guildRunId: text('guild_run_id'),
    modelProvider: text('model_provider'),
    modelName: text('model_name'),
    traceId: text('trace_id'),
    status: text('status').notNull().default('completed'),
    latencyMs: integer('latency_ms'),
    errorMessage: text('error_message'),
    toolCalls: jsonb('tool_calls').$type<unknown[]>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('run_org_idx').on(t.organizationId)],
);

/** Draft / finalized job listing content owned by a channel. */
export const jobListings = pgTable(
  'job_listings',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    jobChannelId: text('job_channel_id')
      .notNull()
      .references(() => jobChannels.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    location: text('location'),
    employmentType: text('employment_type'),
    summary: text('summary'),
    description: text('description'),
    responsibilities: jsonb('responsibilities').$type<string[]>(),
    requirements: jsonb('requirements').$type<string[]>(),
    niceToHaves: jsonb('nice_to_haves').$type<string[]>(),
    salaryRange: text('salary_range'),
    status: text('status').notNull().default('draft'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: text('created_by_user_id'),
  },
  (t) => [index('listing_channel_idx').on(t.jobChannelId)],
);

/** Public posting on the org's OWN job board. */
export const jobBoardPostings = pgTable(
  'job_board_postings',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    jobChannelId: text('job_channel_id').references(() => jobChannels.id, { onDelete: 'set null' }),
    jobListingId: text('job_listing_id').references(() => jobListings.id, { onDelete: 'set null' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    location: text('location'),
    summary: text('summary'),
    contentSnapshot: jsonb('content_snapshot').$type<Record<string, unknown>>(),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: text('created_by_user_id'),
  },
  (t) => [index('posting_org_idx').on(t.organizationId), index('posting_slug_idx').on(t.slug)],
);

/** A candidate (person). Tenant-scoped: same email can exist across orgs. */
export const candidates = pgTable(
  'candidates',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name'),
    email: text('email').notNull(),
    headline: text('headline'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('candidate_org_idx').on(t.organizationId)],
);

/** A candidate's application to a specific channel/posting. */
export const applications = pgTable(
  'applications',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    candidateId: text('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    jobChannelId: text('job_channel_id')
      .notNull()
      .references(() => jobChannels.id, { onDelete: 'cascade' }),
    postingId: text('posting_id').references(() => jobBoardPostings.id, { onDelete: 'set null' }),
    stage: text('stage').notNull().default('applied'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('application_org_idx').on(t.organizationId),
    index('application_channel_idx').on(t.jobChannelId),
  ],
);

/* ── Agent handoff objects (recruiter agent → interview agent, isolated) ── */

/** Distilled, candidate-safe brief + rubric for the interview agent. */
export const interviewPlans = pgTable(
  'interview_plans',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    jobChannelId: text('job_channel_id')
      .notNull()
      .references(() => jobChannels.id, { onDelete: 'cascade' }),
    roleBrief: text('role_brief').notNull(),
    rubric: jsonb('rubric').$type<{ criteria: { key: string; label: string; weight: number }[] }>(),
    questionPlan:
      jsonb('question_plan').$type<
        { id: string; prompt: string; kind: string; payload?: Record<string, unknown> }[]
      >(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('plan_channel_idx').on(t.jobChannelId)],
);

export const interviewSessions = pgTable(
  'interview_sessions',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    candidateId: text('candidate_id').notNull(),
    jobChannelId: text('job_channel_id').notNull(),
    planId: text('plan_id').references(() => interviewPlans.id, { onDelete: 'set null' }),
    sessionStatus: text('session_status').notNull().default('created'),
    mode: text('mode').notNull().default('text'), // 'text' | 'voice'
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    consentRecordedAt: timestamp('consent_recorded_at', { withTimezone: true }),
    recordingUrl: text('recording_url'),
    currentStep: integer('current_step').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('session_app_idx').on(t.applicationId)],
);

export const interviewTurns = pgTable(
  'interview_turns',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    sessionId: text('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'agent' | 'candidate'
    content: text('content').notNull().default(''),
    openui: jsonb('openui').$type<Record<string, unknown> | null>(),
    questionId: text('question_id'),
    createdAt: createdAt(),
  },
  (t) => [index('turn_session_idx').on(t.sessionId)],
);

export const interviewScores = pgTable(
  'interview_scores',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    sessionId: text('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    criterionKey: text('criterion_key').notNull(),
    score: integer('score').notNull(),
    evidence: text('evidence'),
    createdAt: createdAt(),
  },
  (t) => [index('score_session_idx').on(t.sessionId)],
);

/** Final package the worker produces; recruiter agent reads this later. */
export const interviewResultPackages = pgTable(
  'interview_result_packages',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    sessionId: text('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    applicationId: text('application_id').notNull(),
    candidateId: text('candidate_id').notNull(),
    jobChannelId: text('job_channel_id').notNull(),
    overallScore: integer('overall_score'),
    recommendation: text('recommendation'),
    summary: text('summary'),
    strengths: jsonb('strengths').$type<string[]>(),
    concerns: jsonb('concerns').$type<string[]>(),
    rubricScores: jsonb('rubric_scores').$type<{ key: string; label: string; score: number }[]>(),
    transcriptRef: jsonb('transcript_ref').$type<{ turnCount: number }>(),
    createdAt: createdAt(),
  },
  (t) => [index('result_channel_idx').on(t.jobChannelId)],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    organizationId: text('organization_id').notNull(),
    actorUserId: text('actor_user_id'),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_org_idx').on(t.organizationId)],
);

/** Full schema object, used by drizzle + the better-auth adapter. */
export const schema = {
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  connectorAccounts,
  jobChannels,
  channelMessages,
  agentRuns,
  jobListings,
  jobBoardPostings,
  candidates,
  applications,
  interviewPlans,
  interviewSessions,
  interviewTurns,
  interviewScores,
  interviewResultPackages,
  auditEvents,
};
