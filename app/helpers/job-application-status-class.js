import Helper from '@ember/component/helper';

// Maps a JobApplication.status string to a Tailwind pill class set.
// Status list lives on JobApplicationsEdit.statuses; pill shape mirrors
// the score-status pill in components/scores/list.hbs (rounded-full,
// xs, dark-mode-aware).
const STATUS_GROUPS = {
  good: new Set(['Vetted Good', 'Offer', 'Accepted']),
  progress: new Set([
    'Applied',
    'Contact',
    'Interview Scheduled',
    'Interviewed',
    'Technical Test',
    'Awaiting Decision',
  ]),
  bad: new Set(['Vetted Bad', 'Rejected', 'Declined', 'Expired']),
  neutral: new Set(['Unvetted', 'Archived']),
};

const PILL = {
  good: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  bad: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const BASE =
  'inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium';

export default class JobApplicationStatusClassHelper extends Helper {
  compute([status]) {
    let group = 'neutral';
    for (const [key, set] of Object.entries(STATUS_GROUPS)) {
      if (set.has(status)) {
        group = key;
        break;
      }
    }
    return `${BASE} ${PILL[group]}`;
  }
}
