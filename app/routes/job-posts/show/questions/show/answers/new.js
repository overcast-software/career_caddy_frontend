import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsShowAnswersNewRoute extends Route {
  @service store;

  model() {
    const question = this.modelFor('job-posts.show.questions.show');
    return this.store.createRecord('answer', { question });
  }
}
