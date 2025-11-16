import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class ApplicationController extends Controller {
  @service session;
  @service flashMessages;
  @service currentUser;
  @tracked showLoading = false

  @action
  invalidateSession() {
    this.session.invalidate();
  }
}
