import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsNewRoute extends Route {
  @service store;

  async model() {
    await this.store.findAll('company');
    return this.store.createRecord('question');
  }
}
