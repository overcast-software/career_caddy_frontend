import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { infinityModel } from '../../utils/list-model';

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
    return infinityModel(this, 'question', {
      perPage: 20,
      startingPage: 1,
      include: 'company,answers',
      sort: '-id',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
