import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsEditRoute extends Route {
  @service store;

  async model({ question_id }) {
    await this.store.findAll('company');
    return this.store.findRecord('question', question_id);
  }
}
