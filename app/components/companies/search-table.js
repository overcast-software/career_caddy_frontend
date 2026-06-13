import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

// Server-side company search rendered as a table with relate-actions.
// Replaces the two ad-hoc PowerSelects (merge-into + mark-as-alias)
// that previously lived on /admin/companies/:id.
//
// One canonical search shape so future callsites consume this
// component instead of reinventing the search call (the
// reinvention-pile is documented in the parent todo).
//
// Args:
// - sourceCompany: the Company that row-actions act on / from.
export default class CompaniesSearchTableComponent extends Component {
  @service store;
  @service router;
  @service flashMessages;

  @tracked search = '';
  @tracked results = [];
  @tracked searching = false;
  // actingId = `<verb>:<rowId>` for the in-flight row action, or null.
  // Per-row so the spinner pins to the actual button you clicked.
  @tracked actingId = null;

  _lastTerm = null;
  _searchTimer = null;

  willDestroy() {
    super.willDestroy(...arguments);
    if (this._searchTimer) clearTimeout(this._searchTimer);
  }

  @action
  updateSearch(event) {
    this.search = event.target.value;
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this._runSearch(), 250);
  }

  _runSearch() {
    const trimmed = this.search.trim();
    if (trimmed.length < 2) {
      this.results = [];
      this._lastTerm = null;
      return;
    }
    if (trimmed === this._lastTerm) return;
    this.searching = true;
    this.store
      .query('company', {
        'filter[query]': trimmed,
        'page[size]': 20,
      })
      .then((rows) => {
        const sourceId = this.args.sourceCompany?.id;
        const out = [];
        for (const c of rows) {
          if (c.id !== sourceId) out.push(c);
        }
        this.results = out;
        this._lastTerm = trimmed;
      })
      .catch(() => {
        this.flashMessages.danger('Company search failed.');
      })
      .finally(() => {
        this.searching = false;
      });
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
        // Stay on the current page; just pop the row out of results
        // and let the AliasesPanel's hasMany('aliases') re-render with
        // the new alias the api just attached.
        this.results = this.results.filter((r) => r.id !== targetId);
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
