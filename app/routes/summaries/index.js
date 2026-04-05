import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SummariesIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({ search }) {
    return this.infinity.model('summary', {
      perPage: 20,
      startingPage: 1,
      include: 'job-post,resume',
      sort: '-id',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
