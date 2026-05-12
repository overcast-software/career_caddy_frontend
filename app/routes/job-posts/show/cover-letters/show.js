import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowCoverLettersShowRoute extends Route {
  @service store;

  async model({ cover_letter_id }) {
    return await this.store.findRecord('cover-letter', cover_letter_id, {
      reload: true,
    });
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.startPollingIfPending();
  }
}
