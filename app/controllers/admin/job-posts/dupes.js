import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Controller for /admin/job-posts/:job_post_id/dupes. Reads the
// JP's auto-detected duplicate-candidates via hasMany('rel').value()
// and exposes per-row actions: mark source as duplicate of this
// candidate, view, compare side-by-side. The current duplicate-of
// pointer (if any) gets unlink + promote-canonical buttons.
export default class AdminJobPostsDupesController extends Controller {
  @service router;
  @service flashMessages;

  // actingId pins the spinner to the per-row button that was clicked.
  @tracked actingId = null;

  // Read the candidate set live. hasMany('duplicate-candidates').value()
  // is the async-getter pattern from cf-notes "Architecture/Ember Data
  // array footguns" — no .slice() / .toArray() / .objectAt().
  get candidates() {
    const live = this.model?.hasMany('duplicateCandidates').value();
    if (!live) return [];
    return live;
  }

  get currentDuplicateOfId() {
    return this.model?.duplicateOfId;
  }

  isActing = (prefix, id) => this.actingId === `${prefix}:${id}`;

  @action
  refresh() {
    this.model
      ?.reload({ include: 'duplicate-candidates,company' })
      .catch(() => {});
  }

  @action
  markSourceAsDuplicateOf(candidate) {
    if (this.actingId) return;
    const source = this.model;
    if (!source) return;
    // JobPost ids are opaque NanoID strings (CC-77 #79) — pass the id
    // through untouched. parseInt() here would NaN a NanoID.
    const targetId = candidate.id;
    this.actingId = `mark:${candidate.id}`;
    source
      .markDuplicateOf({ target_id: targetId })
      .then(() => {
        this.flashMessages.success(
          `Marked #${source.id} as duplicate of #${candidate.id}.`,
        );
        this.refresh();
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Mark-as-duplicate failed: ${detail}`);
      })
      .finally(() => {
        this.actingId = null;
      });
  }

  @action
  unlinkDuplicate() {
    if (this.actingId) return;
    this.actingId = `unlink:${this.model.id}`;
    this.model
      .unlinkDuplicate()
      .then(() => {
        this.flashMessages.success('Unlinked.');
        this.refresh();
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Unlink failed: ${detail}`);
      })
      .finally(() => {
        this.actingId = null;
      });
  }

  @action
  promoteCanonical() {
    if (this.actingId) return;
    this.actingId = `promote:${this.model.id}`;
    this.model
      .promoteCanonical()
      .then(() => {
        this.flashMessages.success('Promoted to canonical.');
        this.refresh();
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Promote failed: ${detail}`);
      })
      .finally(() => {
        this.actingId = null;
      });
  }
}
