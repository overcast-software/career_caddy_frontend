import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowQuestionsNewRoute extends Route {
  @service store;

  model() {
    const company = this.modelFor('companies.show');
    return this.store.createRecord('question', { company });
  }
}
