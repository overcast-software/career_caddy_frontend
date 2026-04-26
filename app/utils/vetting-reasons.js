// Keep in sync with api/job_hunting/lib/vetting_reasons.py.
// Order drives the dropdown; "other" is the create-new branch in the
// PowerSelectWithCreate UI and is therefore NOT included as a picklist
// option here — it's synthesized when the user types a free-text reason.

export const VETTING_REASONS = [
  { code: 'compensation', label: 'Compensation' },
  { code: 'location', label: 'Location / remote' },
  { code: 'seniority', label: 'Seniority mismatch' },
  { code: 'stack', label: 'Tech / stack mismatch' },
  { code: 'company', label: 'Dislike company' },
];

export const VETTING_REASON_LABELS = Object.fromEntries(
  VETTING_REASONS.map((r) => [r.code, r.label]),
);
VETTING_REASON_LABELS.other = 'Other';

export function reasonLabel(code) {
  if (!code) return null;
  return VETTING_REASON_LABELS[code] || null;
}
