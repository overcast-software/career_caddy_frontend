import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class QuestionsShowAnswersNewRoute extends Route {
  @service store

  async model(){
    const { question_id } = this.paramsFor('questions.show');
    const question = await this.store.peekRecord('question', question_id)
    const answer = this.store.createRecord('answer')
    answer.question = question
    return answer;
  }
}
