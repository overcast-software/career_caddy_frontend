import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApiKeysShowRoute extends Route {
  @service store;

  async model({ api_key_id }) {
    return this.store.findRecord('api-key', api_key_id);
  }
}
