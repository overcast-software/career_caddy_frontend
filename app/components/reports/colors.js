// Shared palette + labels for the report charts (sankey, stacked bar, etc).
// Keeping both here means a color or label tweak updates every chart at once.

export const NODE_LABELS = {
  job_posts: 'Job Posts',
  no_application: 'No Application',
  applications: 'Applications',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  ghosted: 'Ghosted',
  rejected: 'Rejected',
  withdrew: 'Withdrew',
  declined: 'Declined',
  accepted: 'Accepted',
  stub: 'Stub',
  scored: 'Scored',
  unscored: 'Unscored',
  unknown: 'Unknown',
};

export const NODE_COLORS = {
  job_posts: '#10b981',
  applications: '#0ea5e9',
  no_application: '#94a3b8',
  applied: '#facc15',
  interview: '#f97316',
  offer: '#ec4899',
  ghosted: '#f472b6',
  rejected: '#a78bfa',
  withdrew: '#fbbf24',
  declined: '#f87171',
  accepted: '#22c55e',
  stub: '#6b7280',
  scored: '#8b5cf6',
  unscored: '#d1d5db',
  unknown: '#64748b',
};

export const FALLBACK_COLOR = '#64748b';

// Human-readable descriptions for each sankey node. Used for on-hover
// tooltips so viewers can tell what (e.g.) "stub" means without digging.
export const NODE_DESCRIPTIONS = {
  job_posts: 'All job posts in this scope',
  no_application: 'Posts you have not applied to',
  applications: 'Posts where you started an application',
  applied: 'Applications currently in Applied stage',
  interview: 'Applications that reached Interview',
  offer: 'Applications that received an Offer',
  ghosted: 'Applications with no status update in 30+ days',
  rejected: 'Applications rejected by the employer',
  withdrew: 'Applications you withdrew',
  declined: 'Offers you declined',
  accepted: 'Offers you accepted',
  stub: 'Posts with a thin/empty description (< 20 words) — typically email pipeline junk',
  scored: 'Posts that have been AI-scored for you',
  unscored: 'Posts that have not been AI-scored',
  unknown: 'Status does not map to a known bucket',
};

// Maps sankey node id → query params for job-posts.index when clicked.
// null means the node is informational only (no drill-down filter).
export const NODE_LINK_PARAMS = {
  stub: { stub: 'true' },
  scored: { scored: 'true' },
  unscored: { scored: 'false' },
  no_application: { bucket: 'no_application' },
  applied: { bucket: 'applied' },
  interview: { bucket: 'interview' },
  offer: { bucket: 'offer' },
  ghosted: { bucket: 'ghosted' },
  rejected: { bucket: 'rejected' },
  withdrew: { bucket: 'withdrew' },
  accepted: { bucket: 'accepted' },
  declined: { bucket: 'declined' },
};
