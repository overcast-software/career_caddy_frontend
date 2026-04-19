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
  unknown: '#64748b',
};

export const FALLBACK_COLOR = '#64748b';
