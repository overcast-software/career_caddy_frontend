import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsShowAnswersIndexRoute extends Route {
  @service store;

  async model() {
    const question = this.modelFor('questions.show');
    return await question.answers;
  }
}
