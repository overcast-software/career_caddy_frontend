import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AdminUsersShowRoute extends Route {
  @service store;

  model({ user_id }) {
    return this.store.findRecord('user', user_id);
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.firstName = model.firstName ?? '';
    controller.lastName = model.lastName ?? '';
    controller.email = model.email ?? '';
    controller.isStaff = model.isStaff ?? false;
    controller.isActive = model.isActive ?? true;
  }
}
