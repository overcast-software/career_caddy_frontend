import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// /admin/companies/ — staff index. Mirrors /companies/index search +
// pagination shape: search lives in the `search` query param, and
// the route's `infinityModel` cache helper picks the new param up
// via refreshModel.
//
// Optional `source=<id>` queryParam puts the table into relate-mode:
// each row grows merge / set-as-canonical / adopt-as-alias buttons
// that target the source Company. Navigated to from
// /admin/companies/:id via "Find related companies →".
export default class AdminCompaniesIndexController extends Controller {
  @service router;
  @service store;
  @service flashMessages;

  queryParams = ['search', 'source'];

  @tracked search = '';
  @tracked source = null;
  @tracked isSearching;
  // actingId = `<verb>:<rowId>` for the in-flight row action, or null.
  @tracked actingId = null;

  // Resolve the source Company from the store. peekRecord avoids an
  // extra GET when the user just navigated here from
  // /admin/companies/:source — that route's findRecord put it in
  // the identity map. If the user landed cold via URL with ?source=N,
  // peekRecord returns null until the row is fetched some other way;
  // the template falls back to the bare id.
  get sourceCompany() {
    if (!this.source) return null;
    return this.store.peekRecord('company', this.source);
  }

  get relateMode() {
    return Boolean(this.source);
  }

  @action
  updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }

  @action
  startSearching() {
    this.isSearching = true;
  }

  // Clear relate-mode without leaving the page.
  @action
  exitRelateMode() {
    this.source = null;
  }

  isSource = (row) => row?.id === this.source;

  isActing = (prefix, id) => this.actingId === `${prefix}:${id}`;

  @action
  mergeSourceInto(row) {
    if (this.actingId) return;
    const source = this.sourceCompany;
    if (!source) {
      this.flashMessages.danger(
        'Source Company not loaded; visit /admin/companies/' +
          this.source +
          ' first.',
      );
      return;
    }
    const sourceName = source.name;
    const targetId = row.id;
    this.actingId = `merge:${targetId}`;
    source
      .mergeInto(targetId)
      .then(() => {
        this.flashMessages.success(
          `Merged "${sourceName}" into "${row.name}".`,
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
  markSourceAsAliasOf(row) {
    if (this.actingId) return;
    const source = this.sourceCompany;
    if (!source) {
      this.flashMessages.danger(
        'Source Company not loaded; visit /admin/companies/' +
          this.source +
          ' first.',
      );
      return;
    }
    const sourceName = source.name;
    const targetId = row.id;
    this.actingId = `mark-source:${targetId}`;
    source
      .markAsAliasOf(targetId)
      .then(() => {
        this.flashMessages.success(
          `Marked "${sourceName}" as alias of "${row.name}".`,
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
  adoptRowAsAlias(row) {
    if (this.actingId) return;
    const source = this.sourceCompany;
    if (!source) {
      this.flashMessages.danger(
        'Source Company not loaded; visit /admin/companies/' +
          this.source +
          ' first.',
      );
      return;
    }
    const sourceName = source.name;
    const targetId = row.id;
    const targetName = row.name;
    this.actingId = `adopt:${targetId}`;
    row
      .markAsAliasOf(source.id)
      .then(() => {
        this.flashMessages.success(
          `Marked "${targetName}" as alias of "${sourceName}".`,
        );
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Adopt-as-alias failed: ${detail}`);
      })
      .finally(() => {
        this.actingId = null;
      });
  }
}
