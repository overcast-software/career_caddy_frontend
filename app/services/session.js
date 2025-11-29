import Service from 'ember-simple-auth/services/session';
import { service } from '@ember/service';

export default class SessionService extends Service {
  @service router;

  handleAuthentication(transition) {
    if (transition) {
      transition.retry();
    } else {
      this.router.transitionTo('index');
    }
  }

  handleInvalidation() {
    this.router.transitionTo('login');
  }
}
