import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { action } from '@ember/object';
import RSVP from 'rsvp';
import { infinityModel } from '../../../utils/list-model';

// /admin/companies/:company_id/related — staff relate workspace.
// One source Company is in the URL path; rows from a paged company
// search render with merge / set-canonical / adopt-as-alias buttons
// targeting that source. The search shape mirrors
// /admin/companies/index — Menus::SubnavSearch + queryParam refresh
// + infinityModel cache helper + InfinityLoader.
export default class AdminCompaniesRelatedRoute extends Route {
  @service store;
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  // Suppress loading substate on self-transitions so the search
  // input doesn't tear down + remount on every keystroke debounce.
  // Mirrors /companies/index and /admin/companies/index.
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
      results: infinityModel(this, 'company', {
        perPage: 50,
        startingPage: 1,
        sort: 'name',
        ...(search ? { 'filter[query]': search } : {}),
      }),
    });
  }
}
