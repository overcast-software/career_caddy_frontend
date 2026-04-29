import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { infinityModel } from '../../utils/list-model';

export default class AnswersIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({ search }) {
    return infinityModel(this, 'answer', {
      perPage: 20,
      startingPage: 1,
      include: 'question',
      sort: '-id',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
