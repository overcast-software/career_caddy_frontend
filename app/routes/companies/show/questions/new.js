import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowQuestionsNewRoute extends Route {
  @service store;

  model() {
    const { company_id } = this.paramsFor('companies.show');
    const company = this.store.peekRecord('company', company_id);
    const question = this.store.createRecord('question', { company });
    return { question, company };
  }
}
