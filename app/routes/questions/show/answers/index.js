import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class QuestionsShowAnswersIndexRoute extends Route {
  @service store;
  async model() {
    const { question_id } = this.paramsFor('questions.show');
    const question = await this.store.findRecord('question', question_id, {
      include: 'answers',
    });
    return { question, answers: await question.answers };
  }
}
