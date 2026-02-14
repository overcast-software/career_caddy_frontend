import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApiKeysNewRoute extends Route {
  @service store;

  model() {
    return this.store.createRecord('api-key', {
      scopes: ['read', 'write'], // Default scopes
    });
  }
}
