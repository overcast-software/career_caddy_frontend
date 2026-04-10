const MAIN_FLOW = [
  'Unvetted',
  'Vetted Good',
  'Applied',
  'Contact',
  'Interview Scheduled',
  'Interviewed',
  'Technical Test',
  'Awaiting Decision',
  'Offer',
  'Accepted',
];

// Terminal states branch off the main flow at specific points
const BRANCH_POINTS = {
  'Vetted Bad': 'Vetted Good',
  Declined: 'Offer',
  Rejected: 'Awaiting Decision',
  Expired: 'Awaiting Decision',
  Archived: 'Awaiting Decision',
};

export const TERMINAL_STATES = Object.keys(BRANCH_POINTS);

/**
 * Compute the step labels to display for a given job application status.
 * For main flow statuses, returns the full 10-step progression.
 * For terminal states, returns the main flow up to the branch point
 * plus the terminal state appended at the end.
 */
export function stepsForStatus(status) {
  if (MAIN_FLOW.includes(status)) {
    return MAIN_FLOW;
  }

  const branchAt = BRANCH_POINTS[status];
  if (branchAt) {
    const idx = MAIN_FLOW.indexOf(branchAt);
    return [...MAIN_FLOW.slice(0, idx + 1), status];
  }

  return MAIN_FLOW;
}
