import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsShowAnswersEditRoute extends Route {
  @service store;

  async model({ answer_id }) {
    return await this.store.findRecord('answer', answer_id);
  }
}
