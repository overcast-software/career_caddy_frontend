import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsShowAnswersNewRoute extends Route {
  @service store;

  model() {
    const question = this.modelFor('job-applications.show.questions.show');
    return this.store.createRecord('answer', { question });
  }
}
