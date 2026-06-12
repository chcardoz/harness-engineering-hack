# Job Board

## What It Is

Yougrep hosts its own public job board instead of posting jobs to external ATSs (Greenhouse/Ashby). Each org gets a public, unauthenticated board listing its open roles, and each role page doubles as the candidate interview entry point.

## Why (instead of external ATS posting)

Posting to external ATSs is a hard blocker:

- Airbyte agent connectors for Greenhouse/Ashby are read-only. They cannot create/publish job posts, update application status, schedule interviews, or send offers.
- Native ATS write APIs would require per-tenant long-lived credentials, partner/marketplace considerations, and (for Ashby) there is no public publish endpoint.

Owning the board removes the only hard blocker and unifies the public job page with the candidate interview entry point.

## Model

- Org board: `/c/{org-slug}` — a public board listing the org's open roles.
- Role page: `/c/{org-slug}/{job-slug}` — role details plus a "Start interview" CTA (the one-click/skip-the-line entry point).
- Viewing is public and crawlable: clean slugs, not random tokens.
- Starting an interview is lightly gated (candidate email/magic-link) so the session attaches to a candidate.
- Served by the Render `web` service (Next.js), alongside the recruiter app and candidate interview pages.

## Data

Postgres is the system of record for orgs, job listings, board postings, candidates, applications, and interviews.

- `job_board_postings`: tenant-scoped, `draft`/`published` state, public slug, and `published_at`.

## Candidate Entry / Interview Handoff

When a candidate clicks "Start interview" on a role page and clears the light email/magic-link gate, the backend creates an `interview_session` and mints the ephemeral GPT Realtime 2 credential for that session. The public job page is the single entry point into the candidate interview flow.

## Airbyte Relationship (read-only)

Airbyte reads Notion/GitHub/Slack for job context, and can optionally read/import existing Greenhouse/Ashby jobs and candidates as context. It never writes to an ATS. Slack writes for notifications remain a real optional Airbyte capability, separate from ATS posting.

## Risks And Caveats

- Distribution: a self-hosted board has no inbound candidate traffic of its own. Roles will not reach candidates without separate sourcing/outreach.
- Trust/discoverability: candidates may expect roles on familiar external boards rather than a Yougrep-hosted page.
- Public surface: clean, crawlable slugs mean board pages are indexable, so draft vs published state must be enforced carefully.

## Deferred

- Distribution: cross-posting/syndication to external boards to drive inbound candidate traffic.
- ATS write-back into a customer's Greenhouse/Ashby (via the native Greenhouse Harvest API or a unified API like Kombo), until a real customer requires it.
