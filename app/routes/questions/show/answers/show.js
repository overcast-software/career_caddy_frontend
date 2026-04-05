import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsShowAnswersShowRoute extends Route {
  @service store;

  async model({ answer_id }) {
    const { question_id } = this.paramsFor('questions.show');
    const question = this.store.peekRecord('question', question_id);
    const answer = await this.store.findRecord('answer', answer_id);
    return { question, answer };
  }
}
