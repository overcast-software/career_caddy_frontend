import Route from '@ember/routing/route';
import { service } from '@ember/service';

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
    return this.infinity.model('summary', {
      perPage: 20,
      startingPage: 1,
      include: 'job-post',
      sort: '-id',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
