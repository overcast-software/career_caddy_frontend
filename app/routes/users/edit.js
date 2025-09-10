import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class UsersEditRoute extends Route {
  @service store;

  model({ user_id }) {
    return this.store.findRecord('user', user_id);
  }
}
