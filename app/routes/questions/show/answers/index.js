import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class QuestionsShowAnswersIndexRoute extends Route {
  @service store;
  async model(){
    const { question_id } = this.paramsFor('questions.show');
    const question = this.store.peekRecord('question', question_id)
    return question.get('answers');
  }

}
