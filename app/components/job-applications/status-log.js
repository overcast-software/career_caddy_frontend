import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked, cached } from '@glimmer/tracking';
import { action } from '@ember/object';

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

const STATUS_OPTIONS = [
  ...MAIN_FLOW,
  'Declined',
  'Vetted Bad',
  'Rejected',
  'Expired',
  'Archived',
];

const NOGO = new Set([
  'Vetted Bad',
  'Rejected',
  'Declined',
  'Expired',
  'Archived',
]);

// Format a UTC ISO string as a local-time value for <input type="datetime-local">
// which expects "YYYY-MM-DDTHH:MM" in local time.
function toDatetimeLocal(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export default class JobApplicationsStatusLogComponent extends Component {
  @service store;
  @service flashMessages;

  // Log-status form
  @tracked selectedStatus = null;
  @tracked isSaving = false;

  // Per-entry date/note editor
  @tracked expandedId = null; // id of the entry whose edit form is open
  @tracked editingDate = ''; // datetime-local string being edited
  @tracked editingNote = ''; // note text being edited

  get statusOptions() {
    return STATUS_OPTIONS;
  }

  // Cached so both sortedStatuses and impliedStatuses share one computation.
  @cached
  get _sortedRecords() {
    const statuses = this.args.jobApplication?.applicationStatuses;
    if (!statuses) return [];
    return [...statuses].sort((a, b) => {
      const da = new Date(a.loggedAt || a.createdAt || 0);
      const db = new Date(b.loggedAt || b.createdAt || 0);
      return da - db;
    });
  }

  get sortedStatuses() {
    const records = this._sortedRecords;
    return records.map((s, i) => ({
      record: s,
      status: s.status,
      // Prefer user-set loggedAt; fall back to DB createdAt
      displayDate: s.loggedAt || s.createdAt,
      isCurrent: i === records.length - 1,
      dotClass: NOGO.has(s.status)
        ? 'bg-red-400'
        : s.status === 'Accepted'
          ? 'bg-green-500'
          : 'bg-accent-400',
    }));
  }

  // Statuses that will be auto-inserted before the selected one
  // to fill gaps in the main flow.
  get impliedStatuses() {
    if (!this.selectedStatus) return [];
    const selectedIdx = MAIN_FLOW.indexOf(this.selectedStatus);
    if (selectedIdx < 0) return []; // no-go status — no implied chain

    const loggedIdxs = this._sortedRecords
      .map((s) => MAIN_FLOW.indexOf(s.status))
      .filter((i) => i >= 0);
    const lastLoggedIdx = loggedIdxs.length > 0 ? Math.max(...loggedIdxs) : -1;

    const implied = [];
    for (let i = lastLoggedIdx + 1; i < selectedIdx; i++) {
      implied.push(MAIN_FLOW[i]);
    }
    return implied;
  }

  get willLogPreview() {
    return [...this.impliedStatuses, this.selectedStatus].join(' → ');
  }

  get cannotSubmit() {
    return !this.selectedStatus || this.isSaving;
  }

  // ── Log-status actions ────────────────────────────────────────────────────

  @action selectStatus(status) {
    this.selectedStatus = status;
  }

  @action async logStatus() {
    if (!this.selectedStatus) return;
    this.isSaving = true;
    const toLog = [...this.impliedStatuses, this.selectedStatus];
    try {
      for (const status of toLog) {
        await this.store
          .createRecord('job-application-status', {
            status,
            application: this.args.jobApplication,
          })
          .save();
      }
      this.args.jobApplication.status = this.selectedStatus;
      this.selectedStatus = null;
      this.flashMessages.success(
        toLog.length > 1
          ? `Logged ${toLog.length} statuses.`
          : 'Status logged.',
      );
    } catch {
      this.flashMessages.danger('Failed to save status.');
    } finally {
      this.isSaving = false;
    }
  }

  // ── Per-entry date editor actions ─────────────────────────────────────────

  @action toggleExpand(record) {
    if (this.expandedId === record.id) {
      this.expandedId = null;
      this.editingDate = '';
      this.editingNote = '';
    } else {
      this.expandedId = record.id;
      this.editingDate = toDatetimeLocal(record.loggedAt || record.createdAt);
      this.editingNote = record.note || '';
    }
  }

  @action updateEditingDate(event) {
    this.editingDate = event.target.value;
  }

  @action updateEditingNote(event) {
    this.editingNote = event.target.value;
  }

  @action async saveEntry(record) {
    try {
      record.loggedAt = this.editingDate ? new Date(this.editingDate) : null;
      record.note = this.editingNote || null;
      await record.save();
      this.expandedId = null;
      this.editingDate = '';
      this.editingNote = '';
      this.flashMessages.success('Entry updated.');
    } catch {
      this.flashMessages.danger('Failed to update entry.');
    }
  }

  @action cancelEdit() {
    this.expandedId = null;
    this.editingDate = '';
    this.editingNote = '';
  }

  // ── Delete action ─────────────────────────────────────────────────────────

  @action async deleteEntry(record) {
    if (!confirm('Remove this status entry?')) return;
    try {
      await record.destroyRecord();
      await this.args.jobApplication.reload();
    } catch {
      this.flashMessages.danger('Failed to delete status entry.');
    }
  }
}
