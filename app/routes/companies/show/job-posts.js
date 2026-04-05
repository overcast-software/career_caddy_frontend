import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowJobPostsRoute extends Route {
  @service store;
  model() {
    const { company_id } = this.paramsFor('companies.show');
    return this.store.peekRecord('company', company_id);
  }
}
