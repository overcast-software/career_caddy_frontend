import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowAnswersRoute extends Route {
  @service store;

  async model() {
    const { company_id } = this.paramsFor('companies.show');
    const company = this.store.peekRecord('company', company_id);
    return await company.questions;
  }
}
