import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { action } from '@ember/object';
import RSVP from 'rsvp';
import { infinityModel } from '../../../utils/list-model';

// Per-company staff view. Loads the parent Company with
// ``include=aliases,canonical`` (Phase A self-FK so
// <Companies::AliasesPanel> resolves synchronously) and an
// infinity-paged company list used by <Companies::SearchTable>.
//
// The search queryParam refreshes the model — findRecord caches the
// sourceCompany so search-side typing doesn't refetch it. Mirrors
// the /companies/index shape (queryParam + infinityModel).
export default class AdminCompaniesShowRoute extends Route {
  @service store;
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  // Suppress the loading substate on self-transitions (search QP
  // refresh) so the search input doesn't tear down + remount and
  // lose focus. Mirrors /companies/index.
  @action
  loading(transition) {
    if (transition.from && transition.from.name === this.routeName) {
      return false;
    }
    return true;
  }

  model({ company_id, search }) {
    return RSVP.hash({
      sourceCompany: this.store.findRecord('company', company_id, {
        include: 'aliases,canonical',
      }),
      searchResults: infinityModel(this, 'company', {
        perPage: 20,
        startingPage: 1,
        sort: 'name',
        ...(search ? { 'filter[query]': search } : {}),
      }),
    });
  }
}
