import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({ search }) {
    return this.infinity.model('job-post', {
      perPage: 20,
      startingPage: 1,
      include: 'scores,cover-letters,company,scores.resume',
      sort: '-posted_date',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
