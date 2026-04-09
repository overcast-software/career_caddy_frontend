import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AdminRoute extends Route {
  @service currentUser;
  @service flashMessages;
  @service router;

  beforeModel() {
    if (!this.currentUser.user?.isStaff) {
      this.flashMessages.danger('Access denied. Staff only.');
      this.router.transitionTo('index');
    }
  }
}
