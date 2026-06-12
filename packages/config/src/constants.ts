/** Product-wide constants shared across packages. */

export const APP_NAME = 'Yougrep';
export const APP_TAGLINE = 'The recruiter workspace where every channel is a job.';

/** Public job board path helpers. Board lives at /c/{org-slug}. */
export const boardPath = (orgSlug: string) => `/c/${orgSlug}`;
export const rolePath = (orgSlug: string, jobSlug: string) => `/c/${orgSlug}/${jobSlug}`;

/** Posting lifecycle. */
export const POSTING_STATUS = ['draft', 'published', 'closed'] as const;
export type PostingStatus = (typeof POSTING_STATUS)[number];

/** Interview session lifecycle. */
export const INTERVIEW_STATUS = ['created', 'in_progress', 'completed', 'abandoned'] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUS)[number];

/** Application pipeline stages (recruiter side). */
export const APPLICATION_STAGE = [
  'applied',
  'interviewing',
  'interviewed',
  'shortlisted',
  'rejected',
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGE)[number];

/** Connector providers (read-only context sources). */
export const CONNECTOR_PROVIDERS = ['notion', 'github', 'slack', 'greenhouse', 'ashby'] as const;
export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

/** Mutations that require explicit human confirmation before the agent runs them. */
export const CONFIRMABLE_ACTIONS = [
  'publish_posting',
  'send_outreach',
  'reject_candidate',
] as const;
export type ConfirmableAction = (typeof CONFIRMABLE_ACTIONS)[number];

/** A slug-safe transform used for org and job slugs. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'untitled'
  );
}
