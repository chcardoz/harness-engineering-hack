import type { OpenUIAction } from '@yougrep/openui';
import type { JobChannelIntent } from './types';

/**
 * Classify a recruiter turn into an intent. An explicit OpenUI action (a
 * pressed button) takes precedence over free-text keyword matching, because
 * buttons are unambiguous. Free text is routed by keyword — deterministic and
 * good enough for the demo; in live mode the model can override via the
 * system prompt, but routing the UI is the agent's own deterministic job.
 */
export function classifyIntent(message: string, action?: OpenUIAction): JobChannelIntent {
  if (action) {
    switch (action.actionId) {
      case 'draft_listing':
      case 'refine_listing':
        return 'draft_listing';
      case 'review_candidates':
        return 'review_candidates';
      case 'compare_candidates':
        return 'compare_candidates';
      case 'build_interview':
        return 'build_interview';
      case 'publish':
      case 'confirm_publish':
        return 'publish';
      default:
        break;
    }
  }

  const m = message.toLowerCase();
  const has = (...words: string[]) => words.some((w) => m.includes(w));

  if (has('publish', 'go live', 'post the job', 'put it on the board')) return 'publish';
  if (has('compare', 'side by side', 'side-by-side', 'rank them', 'shortlist')) {
    return 'compare_candidates';
  }
  if (has('candidate', 'applicant', 'who applied', 'review')) return 'review_candidates';
  if (
    has(
      'interview plan',
      'rubric',
      'build the interview',
      'interview questions',
      'plan the interview',
    )
  ) {
    return 'build_interview';
  }
  if (has('listing', 'draft', 'job description', 'jd', 'write the post', 'write up the role')) {
    return 'draft_listing';
  }
  if (has('help', 'what can you do', 'how does this work')) return 'help';

  return 'overview';
}
