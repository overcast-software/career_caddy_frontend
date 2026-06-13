import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

// Server-side company search rendered as a table with relate-actions.
// Replaces the two ad-hoc PowerSelects (merge-into + mark-as-alias)
// that previously lived on /admin/companies/:id.
//
// Search state lives on the parent route's queryParam — the route
// drives ember-infinity, the component just renders. This matches
// /companies/index's shape.
//
// Args:
//   @sourceCompany   — the Company that row-actions act on / from.
//   @searchResults   — the ember-infinity InfinityModel for the query.
//   @searchTerm      — the current search value (drives the input).
//   @isSearching     — true while the debounced input is settling.
//   @onSearch        — (value) → void; route updates the queryParam.
//   @onSearchStart   — () → void; flips controller.isSearching=true.
export default class CompaniesSearchTableComponent extends Component {
  @service router;
  @service flashMessages;

  // actingId = `<verb>:<rowId>` for the in-flight row action, or null.
  // Per-row so the spinner pins to the actual button you clicked.
  @tracked actingId = null;

  // Locally suppress rows that the user just marked as aliases of the
  // current Company — the InfinityModel doesn't get a re-query so
  // they'd otherwise linger.
  @tracked _suppressedIds = new Set();

  get rows() {
    const live = this.args.searchResults;
    if (!live) return [];
    const sourceId = this.args.sourceCompany?.id;
    const out = [];
    for (const c of live) {
      if (!c) continue;
      if (c.id === sourceId) continue;
      if (this._suppressedIds.has(c.id)) continue;
      out.push(c);
    }
    return out;
  }

  isActing(prefix, id) {
    return this.actingId === `${prefix}:${id}`;
  }

  @action
  mergeCurrentInto(target) {
    if (this.actingId) return;
    const source = this.args.sourceCompany;
    if (!source) return;
    const sourceName = source.name;
    const targetId = target.id;
    this.actingId = `merge:${targetId}`;
    source
      .mergeInto(targetId)
      .then(() => {
        this.flashMessages.success(
          `Merged "${sourceName}" into "${target.name}".`,
        );
        this.router.transitionTo('admin.companies.show', targetId);
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Merge failed: ${detail}`);
      })
      .finally(() => {
        this.actingId = null;
      });
  }

  @action
  markCurrentAsAliasOf(target) {
    if (this.actingId) return;
    const source = this.args.sourceCompany;
    if (!source) return;
    const sourceName = source.name;
    const targetId = target.id;
    this.actingId = `mark-current:${targetId}`;
    source
      .markAsAliasOf(targetId)
      .then(() => {
        this.flashMessages.success(
          `Marked "${sourceName}" as alias of "${target.name}".`,
        );
        this.router.transitionTo('admin.companies.show', targetId);
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Mark-as-alias failed: ${detail}`);
      })
      .finally(() => {
        this.actingId = null;
      });
  }

  @action
  markRowAsAliasOfCurrent(target) {
    if (this.actingId) return;
    const source = this.args.sourceCompany;
    if (!source) return;
    const targetName = target.name;
    const sourceId = source.id;
    const targetId = target.id;
    this.actingId = `mark-row:${targetId}`;
    target
      .markAsAliasOf(sourceId)
      .then(() => {
        this.flashMessages.success(
          `Marked "${targetName}" as alias of "${source.name}".`,
        );
        // Pop the row out so it doesn't linger in the current results.
        // Assign a fresh Set — tracked Set mutations don't propagate.
        const next = new Set(this._suppressedIds);
        next.add(targetId);
        this._suppressedIds = next;
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Mark-as-alias failed: ${detail}`);
      })
      .finally(() => {
        this.actingId = null;
      });
  }
}
