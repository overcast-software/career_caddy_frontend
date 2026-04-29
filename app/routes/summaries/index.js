import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { infinityModel } from '../../utils/list-model';

export default class SummariesIndexRoute extends Route {
  @service infinity;
  @service store;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({ search }) {
    this.store.query('resume', { slim: 1 });
    return infinityModel(this, 'summary', {
      perPage: 20,
      startingPage: 1,
      include: 'job-post',
      sort: '-id',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
