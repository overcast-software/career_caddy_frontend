import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Controller for /admin/companies/:company_id. Owns the search
// queryParam + Federation toggle. The relate-actions
// (merge-into / mark-as-alias both directions) live in
// <Companies::SearchTable>.
export default class AdminCompaniesShowController extends Controller {
  @service flashMessages;

  queryParams = ['search'];

  @tracked search = '';
  @tracked isSearching = false;

  // Phase 6a — federation toggle in-flight flag. Disables the
  // checkbox while the PATCH is pending so a double-click can't
  // queue two saves.
  @tracked savingFederation = false;

  @action
  updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }

  @action
  startSearching() {
    this.isSearching = true;
  }

  // Phase 6a — staff Federation-enabled toggle. Standard Ember Data
  // PATCH (no apiAction verb) because ``federation_enabled`` is just
  // a model attribute on Company. Mirror of answers/show.js
  // toggleFavorite — flip the attribute, save, rollback on failure.
  @action
  toggleFederationEnabled(event) {
    if (this.savingFederation) return;
    const next = event.target.checked;
    const company = this.model.sourceCompany;
    const previous = company.federationEnabled;
    company.federationEnabled = next;
    this.savingFederation = true;
    company
      .save()
      .then(() => {
        this.flashMessages.success(
          next
            ? `Federation enabled for "${company.name}".`
            : `Federation disabled for "${company.name}".`,
        );
      })
      .catch((err) => {
        company.federationEnabled = previous;
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Failed to update federation: ${detail}`);
      })
      .finally(() => {
        this.savingFederation = false;
      });
  }
}
