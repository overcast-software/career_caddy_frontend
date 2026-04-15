import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowQuestionsShowAnswersNewRoute extends Route {
  @service store;

  model() {
    const question = this.modelFor('companies.show.questions.show');
    return this.store.createRecord('answer', { question });
  }
}
