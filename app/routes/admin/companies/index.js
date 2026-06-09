import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { infinityModel } from '../../../utils/list-model';

// Staff hub for the Phase A dedupe redesign. The Company table has
// grown into the multi-thousands, so the original `findAll('company')`
// pulled the whole world into memory on every visit. The route now
// fetches page 1 via ember-infinity and lets the user pull the next
// page when they scroll the sentinel into view.
//
// Pattern mirrors /companies/index — same query-param search, same
// infinityModel cache helper, same loading-substate suppression.
// See cf-notes "Architecture/Ember Data array footguns" for the rule
// against raw store.query in components: pagination lives on the
// route + controller, never in a Glimmer component.
export default class AdminCompaniesIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  // In-route refresh (debounce updating QPs) would render
  // index-loading.hbs, which has no <:subnav> slot — the search
  // input gets torn down + remounted, losing focus. Suppress the
  // substate for self-transitions; cold loads still get the
  // skeleton.
  @action
  loading(transition) {
    if (transition.from && transition.from.name === this.routeName) {
      return false;
    }
    return true;
  }

  model({ search }) {
    return infinityModel(this, 'company', {
      perPage: 50,
      startingPage: 1,
      sort: 'name',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
