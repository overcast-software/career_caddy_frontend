import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
  @service session;
  @service flashMessages;
  @service currentUser;

  @action
  invalidateSession() {
    this.session.invalidate();
  }
}
