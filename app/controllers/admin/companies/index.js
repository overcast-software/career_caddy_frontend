import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

// /admin/companies/ — staff index. Mirrors /companies/index search +
// pagination shape: search lives in the `search` query param, and
// the route's `infinityModel` cache helper picks the new param up
// via refreshModel. The controller only owns the debounce/loading
// indicator state — the InfinityLoader handles append-on-scroll.
//
// Relate-actions (merge / mark-as-alias both directions) live on
// /admin/companies/:id/related (a sibling route) — this index is
// for general staff browsing.
export default class AdminCompaniesIndexController extends Controller {
  queryParams = ['search'];

  @tracked search = '';
  @tracked isSearching;

  @action
  updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }

  @action
  startSearching() {
    this.isSearching = true;
  }
}
