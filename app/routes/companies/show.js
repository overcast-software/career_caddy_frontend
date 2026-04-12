import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowRoute extends Route {
  @service store;

  model({ company_id }) {
    return this.store.findRecord('company', company_id);
  }
}
