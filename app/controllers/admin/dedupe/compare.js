import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Comparable fields on a JobPost rendered side-by-side. Order matters
// — it's the order rows appear in the template. `key` is the
// field_overrides key the api expects; `label` is the heading; `get`
// pulls the displayed value off a JobPost. `companyName` reads
// `.company.get('name')` via the resolved belongsTo proxy (the route
// includes ?include=company so the proxy is already loaded).
//
// "location" is in the api payload contract but JobPost has no
// `location` attribute in the frontend model yet. Both halves come back
// as undefined → the row is skipped (see `comparableRows` below). Once
// the model gains the attr, this list doesn't need to change.
export const COMPARABLE_FIELDS = [
  { key: 'title', label: 'Title', get: (jp) => jp?.title },
  {
    key: 'description',
    label: 'Description',
    get: (jp) => jp?.description,
  },
  { key: 'apply_url', label: 'Apply URL', get: (jp) => jp?.applyUrl },
  { key: 'location', label: 'Location', get: (jp) => jp?.location },
  {
    key: 'company',
    label: 'Company',
    get: (jp) => jp?.belongsTo('company').value()?.name,
  },
];

const RELATION_OPTIONS = [
  { value: 'duplicate', label: 'Duplicate of' },
  { value: 'repost', label: 'Repost of' },
  { value: 'none', label: 'Not related' },
];

export default class AdminDedupeCompareController extends Controller {
  @service flashMessages;
  @service router;

  // Per-field choice. Shape: { [fieldKey]: "A" | "B" }. Missing key =
  // "keep canonical" → omitted from the field_overrides payload, which
  // the server interprets as "no override; keep target's value".
  @tracked overrides = {};
  // "duplicate" | "repost" | "none" — none disables the submit button.
  @tracked relation = 'duplicate';
  @tracked submitting = false;

  relationOptions = RELATION_OPTIONS;

  resetState() {
    this.overrides = {};
    this.relation = 'duplicate';
    this.submitting = false;
  }

  // Build the row list. Each row carries the two raw values + the
  // current selection so the template renders the three-radio set
  // without further computation. Rows where both halves are empty are
  // dropped — nothing to compare and rendering an empty row is just
  // visual noise.
  get comparableRows() {
    const { a, b } = this.model;
    const out = [];
    for (const field of COMPARABLE_FIELDS) {
      const valueA = field.get(a);
      const valueB = field.get(b);
      if (!valueA && !valueB) continue;
      out.push({
        key: field.key,
        label: field.label,
        valueA: valueA || '',
        valueB: valueB || '',
        selection: this.overrides[field.key] || 'canonical',
      });
    }
    return out;
  }

  get canSubmit() {
    return !this.submitting && this.relation !== 'none';
  }

  get submitLabel() {
    if (this.relation === 'repost') return 'Mark as repost of B';
    if (this.relation === 'duplicate') return 'Mark as duplicate of B';
    return 'Pick a relation';
  }

  @action
  setOverride(fieldKey, value) {
    if (value === 'canonical') {
      const next = { ...this.overrides };
      delete next[fieldKey];
      this.overrides = next;
    } else {
      this.overrides = { ...this.overrides, [fieldKey]: value };
    }
  }

  @action
  setRelation(value) {
    this.relation = value;
  }

  @action
  submit(event) {
    event?.preventDefault?.();
    if (!this.canSubmit) return;
    const { a, b } = this.model;
    const payload = {
      // JobPost ids are opaque NanoID strings (CC-77 #79) — send as-is.
      target_id: b.id,
      relation: this.relation,
    };
    // Only send field_overrides when the user actually picked at least
    // one. An empty object is harmless on the server side but it's
    // cleaner not to ship the key at all.
    const hasOverrides = Object.keys(this.overrides).length > 0;
    if (hasOverrides) {
      payload.field_overrides = { ...this.overrides };
    }
    this.submitting = true;
    a.markDuplicateOf(payload)
      .then(() => {
        const label = this.relation === 'repost' ? 'repost' : 'duplicate';
        this.flashMessages.success(
          `JP #${a.id} marked as ${label} of #${b.id}.`,
        );
        this.router.transitionTo('job-posts.show', b.id);
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Mark-duplicate failed: ${detail}`);
      })
      .finally(() => {
        this.submitting = false;
      });
  }
}
