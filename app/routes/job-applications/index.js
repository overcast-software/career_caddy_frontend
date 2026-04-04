import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({ search }) {
    return this.infinity.model('job-application', {
      perPage: 20,
      startingPage: 1,
      include: 'job-post.company',
      sort: '-applied_at',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
