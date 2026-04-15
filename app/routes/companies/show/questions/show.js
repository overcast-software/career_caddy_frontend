import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowQuestionsShowRoute extends Route {
  @service store;

  async model({ question_id }) {
    return await this.store.findRecord('question', question_id, {
      include: 'answers',
      reload: true,
    });
  }
}
