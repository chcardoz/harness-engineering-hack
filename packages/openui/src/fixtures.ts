/**
 * Representative OpenUIDocument fixtures for development, testing, and visual QA.
 *
 * Valid fixtures use the doc()/node() helpers from types.ts.
 * Malformed fixtures are raw objects that deliberately violate the contract
 * to exercise OpenUIFallback.
 */

import { doc, node } from './types';
import type { OpenUIDocument } from './types';

/* ── Valid fixtures ──────────────────────────────────────────────────────── */

/** A JobListingDraft for a Senior Postgres Engineer role. */
export const JOB_LISTING_DRAFT = doc(
  node('JobListingDraft', {
    title: 'Senior Postgres Engineer',
    location: 'Remote (US/EU)',
    employmentType: 'Full-time',
    salaryRange: '$160k – $210k',
    summary:
      "We're looking for a deep Postgres specialist to own our data infrastructure. You'll optimize queries, design replication topologies, and guide the team on data modeling best practices.",
    responsibilities: [
      'Own schema design and migration strategy for a 2 TB+ multi-tenant database',
      'Profile and tune slow queries; maintain index hygiene',
      'Implement logical replication and point-in-time recovery procedures',
      'Partner with product engineers to review data-model changes',
      'Evaluate and integrate Postgres extensions (pg_partman, TimescaleDB, pgvector)',
    ],
    requirements: [
      '5+ years of production Postgres experience',
      'Expertise in EXPLAIN ANALYZE, autovacuum tuning, WAL configuration',
      'Solid understanding of MVCC, locking, and transaction isolation',
      'Experience with Postgres HA setups (Patroni, pgBouncer)',
    ],
    niceToHaves: [
      'Familiarity with Citus or other sharding approaches',
      'Experience with ClickHouse or columnar stores',
      'Contributions to Postgres-adjacent open-source projects',
    ],
  }),
);

/** A CandidateCard for a strong applicant. */
export const CANDIDATE_CARD = doc(
  node('CandidateCard', {
    candidateId: 'cand_abc123',
    name: 'Priya Mehta',
    headline: 'Staff Eng @ Stripe · 8 yrs Postgres · pg_partman contributor',
    overallScore: 88,
    recommendation:
      'Strong hire — deep query optimization chops and excellent communication in the technical screen.',
    strengths: [
      'Built a Patroni HA cluster from scratch at Stripe',
      'Authored internal Postgres migration tooling used by 60+ engineers',
      'Contributed pg_partman patches upstream',
    ],
    concerns: [
      'Limited experience with Citus / horizontal sharding',
      'Prefers async work; may need alignment on on-call expectations',
    ],
  }),
);

/** A CandidateComparisonTable with three candidates. */
export const CANDIDATE_COMPARISON_TABLE = doc(
  node('CandidateComparisonTable', {
    criteria: [
      { key: 'query_tuning', label: 'Query tuning' },
      { key: 'ha_ops', label: 'HA operations' },
      { key: 'schema_design', label: 'Schema design' },
      { key: 'communication', label: 'Communication' },
    ],
    candidates: [
      {
        candidateId: 'cand_abc123',
        name: 'Priya Mehta',
        overallScore: 88,
        scores: { query_tuning: 5, ha_ops: 4, schema_design: 5, communication: 4 },
      },
      {
        candidateId: 'cand_def456',
        name: 'Jordan Li',
        overallScore: 74,
        scores: { query_tuning: 3, ha_ops: 5, schema_design: 3, communication: 4 },
        note: 'Very strong in ops; weaker on query-level analysis',
      },
      {
        candidateId: 'cand_ghi789',
        name: 'Tomás García',
        overallScore: 61,
        scores: { query_tuning: 3, ha_ops: 2, schema_design: 4, communication: 3 },
        note: 'Good schema instincts but limited HA experience',
      },
    ],
  }),
);

/** A QuestionCard for a text interview question. */
export const QUESTION_CARD = doc(
  node('QuestionCard', {
    questionId: 'q_bloat',
    prompt:
      "Explain what table bloat is in Postgres and describe two strategies you'd use to address it in a high-write production system.",
    helper: "Take your time -- there's no single right answer here.",
    inputKind: 'longtext',
  }),
);

/** An SQLProblemEditor with a schema hint and starter query. */
export const SQL_PROBLEM_EDITOR = doc(
  node('SQLProblemEditor', {
    questionId: 'q_sql_candidates',
    prompt:
      'Write a query that returns the top 3 candidates per job opening, ordered by overall_score descending. Include the job title, candidate name, and score.',
    schemaHint: `jobs          (id uuid PK, title text, org_id uuid)
candidates    (id uuid PK, name text, job_id uuid FK jobs)
interview_results (id uuid PK, candidate_id uuid FK candidates, overall_score numeric)`,
    starter: `SELECT
  j.title,
  c.name,
  ir.overall_score
FROM jobs j
-- your query here
LIMIT 50;`,
  }),
);

/** An InterviewComplete closing card. */
export const INTERVIEW_COMPLETE = doc(
  node('InterviewComplete', {
    headline: 'All done — great work!',
    message:
      'Your responses have been recorded. The hiring team will review them and reach out within 3–5 business days. Thanks for taking the time to interview with us.',
  }),
);

/* ── Malformed fixtures ──────────────────────────────────────────────────── */

/**
 * A document containing:
 * 1. A node with an unknown component name — exercises the "Unknown component" fallback.
 * 2. A node with a known component but invalid props — exercises the "Invalid props" fallback.
 */
export const MALFORMED_DOCUMENT: OpenUIDocument = {
  version: '0.5',
  nodes: [
    // Unknown component — not in RECRUITER_COMPONENTS or INTERVIEW_COMPONENTS
    {
      component: 'GreenhousePostConfirm' as never,
      props: { something: 'here' },
    },
    // Known component (CandidateCard) but `name` is missing (required field)
    {
      component: 'CandidateCard',
      props: {
        // name is intentionally omitted
        headline: 'This will fail validation',
        overallScore: 999, // also out of range
      },
    },
  ],
};
