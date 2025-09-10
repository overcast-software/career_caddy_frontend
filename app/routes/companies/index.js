import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesIndexRoute extends Route {
  @service store;

  model() {
    return this.store.findAll('company');
  }
}
