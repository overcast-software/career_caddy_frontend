import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({ search }) {
    return this.infinity.model('question', {
      perPage: 20,
      startingPage: 1,
      include: 'company,answers',
      sort: '-id',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
