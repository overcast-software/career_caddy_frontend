import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class LoginController extends Controller {
  @service session;
  @service flashMessages;
  @service router;
  @tracked username;
  @tracked password;
  @tracked errorMessage;

  @action async authenticate(e) {
    e.preventDefault();
    let { username, password } = this;
    try {
      await this.session.authenticate('authenticator:jwt', username, password);
    } catch (error) {
      this.flashMessages.danger(
        error?.error || error?.errors?.[0]?.detail || 'Login failed',
      );
    }
    this.router
      .transitionTo('index')
      .then(this.flashMessages.success('Successfully logged in'));
  }

  @action updatePassword(e) {
    this.password = e.target.value;
  }

  @action updateUsername(e) {
    this.username = e.target.value;
  }
}
