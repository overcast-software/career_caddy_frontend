import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowJobPostsRoute extends Route {
  @service store;
  model() {
    const { company_id } = this.paramsFor('companies.show');
    const company = this.store.peekRecord('company', company_id)
    return company.jobPosts
  }
}
