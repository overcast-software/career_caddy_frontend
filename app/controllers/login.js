import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import config from 'career-caddy-frontend/config/environment';

export default class LoginController extends Controller {
  @service session;
  @service flashMessages;
  @service router;
  @service health;

  get bootstrapOpen() {
    return this.health.bootstrapOpen;
  }
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
        error?.error ||
          error?.errors?.[0]?.detail ||
          error?.message ||
          'Login failed',
      );
      return;
    }
    this.flashMessages.success('Successfully logged in');
  }

  @action async tryDemo() {
    try {
      const host = config.APP.API_HOST || '';
      const response = await fetch(`${host}/api/v1/guest-session/`);
      if (!response.ok) {
        this.flashMessages.warning(
          'Demo mode is not available on this server.',
        );
        return;
      }
      const tokens = await response.json();
      await this.session.authenticate('authenticator:jwt', null, null, tokens);
    } catch {
      this.flashMessages.danger('Could not start demo session.');
    }
  }

  @action updatePassword(e) {
    this.password = e.target.value;
  }

  @action updateUsername(e) {
    this.username = e.target.value;
  }
}
