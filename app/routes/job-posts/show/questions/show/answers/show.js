import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsShowAnswersShowRoute extends Route {
  @service store;

  activate() {
    window.scrollTo(0, 0);
  }

  async model({ answer_id }) {
    return await this.store.findRecord('answer', answer_id);
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.startPollingIfPending();
  }
}
