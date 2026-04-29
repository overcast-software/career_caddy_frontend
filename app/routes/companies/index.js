import Route from '@ember/routing/route';
import { service } from '@ember/service';
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

  model({ search }) {
    return infinityModel(this, 'company', {
      perPage: 20,
      startingPage: 1,
      sort: 'name',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
