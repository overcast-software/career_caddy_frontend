import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Controller for /admin/companies/:company_id. Owns the merge-into
// affordance: the PowerSelect search of other companies and the
// confirm action that POSTs to the api. Search uses the existing
// filter[query] handler on CompanyViewSet.list (icontains on name
// and display_name).
export default class AdminCompaniesShowController extends Controller {
  @service store;
  @service router;
  @service flashMessages;

  @tracked mergeTarget = null;
  @tracked merging = false;
  // Phase 6a — federation toggle in-flight flag. Disables the
  // checkbox while the PATCH is pending so a double-click can't
  // queue two saves.
  @tracked savingFederation = false;

  // PowerSelect requires @options even when @search is used (the
  // initial empty dropdown reads from this). Search-only flow, so the
  // resting list is empty.
  emptyOptions = [];

  // PowerSelect onSearch — async filter against the api. Pagination
  // kept small; staff are searching for a specific known company,
  // not browsing.
  searchCompanies = (term) => {
    if (!term || term.length < 2) return [];
    return this.store
      .query('company', {
        'filter[query]': term,
        'page[size]': 20,
      })
      .then((results) => {
        // Filter out the current company — merging into self is
        // rejected on the api side anyway, but presenting it in the
        // dropdown is just noise.
        const sourceId = this.model.id;
        const filtered = [];
        for (const c of results) {
          if (c.id !== sourceId) filtered.push(c);
        }
        return filtered;
      });
  };

  @action
  selectMergeTarget(company) {
    this.mergeTarget = company;
  }

  @action
  clearMergeTarget() {
    this.mergeTarget = null;
  }

  // Phase 6a — staff Federation-enabled toggle. Standard Ember Data
  // PATCH (no apiAction verb) because ``federation_enabled`` is just
  // a model attribute on Company. Mirror of answers/show.js
  // toggleFavorite — flip the attribute, save, rollback on failure.
  @action
  toggleFederationEnabled(event) {
    if (this.savingFederation) return;
    const next = event.target.checked;
    const previous = this.model.federationEnabled;
    this.model.federationEnabled = next;
    this.savingFederation = true;
    this.model
      .save()
      .then(() => {
        this.flashMessages.success(
          next
            ? `Federation enabled for "${this.model.name}".`
            : `Federation disabled for "${this.model.name}".`,
        );
      })
      .catch((err) => {
        this.model.federationEnabled = previous;
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Failed to update federation: ${detail}`);
      })
      .finally(() => {
        this.savingFederation = false;
      });
  }

  @action
  confirmMerge() {
    if (!this.mergeTarget || this.merging) return;
    const target = this.mergeTarget;
    const targetId = target.id;
    const sourceName = this.model.name;
    this.merging = true;
    this.model
      .mergeInto(targetId)
      .then(() => {
        this.flashMessages.success(
          `Merged "${sourceName}" into "${target.name}".`,
        );
        this.mergeTarget = null;
        this.router.transitionTo('admin.companies.show', targetId);
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Merge failed: ${detail}`);
      })
      .finally(() => {
        this.merging = false;
      });
  }
}
