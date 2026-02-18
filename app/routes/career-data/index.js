import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CareerDataIndexRoute extends Route {
  @service store;

  async model() {
    return this.store.queryRecord('career-data', {});
  }
}
