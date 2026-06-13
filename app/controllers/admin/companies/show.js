import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Controller for /admin/companies/:company_id. Owns the search
// queryParam + the SearchTable's InfinityModel. The relate-actions
// (merge-into / mark-as-alias both directions) live in
// <Companies::SearchTable>.
//
// Mirrors /admin/companies/index's search shape (Menus::SubnavSearch
// → updateSearch → infinity.model('company', { filter[query] })) so
// there's one canonical company-search pattern in the staff tree.
export default class AdminCompaniesShowController extends Controller {
  @service infinity;
  @service flashMessages;

  queryParams = ['search'];

  @tracked search = '';
  @tracked isSearching = false;
  @tracked searchResults = null;

  // Rebuild the InfinityModel from the current `search` value.
  // Called from the route's setupController on every entry/refresh
  // and from updateSearch when the user types. Replacing the
  // InfinityModel (rather than mutating it) lets ember-infinity
  // restart its paging cursor cleanly.
  @action
  refreshResults() {
    this.searchResults = this.infinity.model('company', {
      perPage: 20,
      startingPage: 1,
      sort: 'name',
      ...(this.search ? { 'filter[query]': this.search } : {}),
    });
  }

  @action
  updateSearch(value) {
    this.search = value;
    this.isSearching = false;
    this.refreshResults();
  }

  @action
  startSearching() {
    this.isSearching = true;
  }
}
