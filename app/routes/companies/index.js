import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { infinityModel } from '../../utils/list-model';

export default class CompaniesIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  // In-route refresh (e.g. search debounce updating QPs) would render
  // index-loading.hbs, which has no <:subnav> slot — the search input
  // gets torn down + remounted, losing focus. Suppress the substate
  // for self-transitions; cold loads still get the skeleton.
  @action
  loading(transition) {
    if (transition.from && transition.from.name === this.routeName) {
      return false;
    }
    return true;
  }

  model({ search }) {
    return infinityModel(this, 'company', {
      perPage: 20,
      startingPage: 1,
      sort: 'name',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
