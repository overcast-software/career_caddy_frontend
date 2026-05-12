import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowSummariesShowRoute extends Route {
  @service store;

  async model({ summary_id }) {
    return await this.store.findRecord('summary', summary_id, { reload: true });
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.startPollingIfPending();
  }
}
