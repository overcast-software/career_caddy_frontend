import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesNewRoute extends Route {
  @service store;

  model() {
    return this.store.createRecord('company');
  }
}
