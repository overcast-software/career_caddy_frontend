import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class LoginController extends Controller {
  @service session;
  @service router;
  @tracked username;
  @tracked password;
  @tracked errorMessage;

  @action
  async login(e) {
    e.preventDefault();
    this.errorMessage = null;
    try {
      await this.session.login(this.username, this.password);
      this.router.transitionTo('resumes.index');
    } catch (error) {
      this.errorMessage = error.message || 'Login failed';
    }
  }

  @action
  updateUsername(e) {
    this.username = e.target.value;
  }

  @action
  updatePassword(e) {
    this.password = e.target.value;
  }
}
