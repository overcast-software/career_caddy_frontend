import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({ search }) {
    return this.infinity.model('company', {
      perPage: 20,
      startingPage: 1,
      sort: 'name',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
