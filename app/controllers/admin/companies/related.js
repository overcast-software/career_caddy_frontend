import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Controller for /admin/companies/:company_id/related. Mirrors
// /admin/companies/index's search shape but adds the relate-actions
// keyed on model.sourceCompany (the source in the URL path).
export default class AdminCompaniesRelatedController extends Controller {
  @service router;
  @service flashMessages;

  queryParams = ['search'];

  @tracked search = '';
  @tracked isSearching;
  // actingId = `<verb>:<rowId>` for the in-flight row action, or null.
  @tracked actingId = null;

  @action
  updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }

  @action
  startSearching() {
    this.isSearching = true;
  }

  isSource = (row) => row?.id === this.model?.sourceCompany?.id;
  isActing = (prefix, id) => this.actingId === `${prefix}:${id}`;

  @action
  mergeSourceInto(row) {
    if (this.actingId) return;
    const source = this.model?.sourceCompany;
    if (!source) return;
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
    const source = this.model?.sourceCompany;
    if (!source) return;
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
    const source = this.model?.sourceCompany;
    if (!source) return;
    const targetId = row.id;
    const targetName = row.name;
    this.actingId = `adopt:${targetId}`;
    row
      .markAsAliasOf(source.id)
      .then(() => {
        this.flashMessages.success(
          `Marked "${targetName}" as alias of "${source.name}".`,
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
