import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class GetStartedController extends Controller {
  @service extensionInstall;
  @service session;

  get installLink() {
    return this.extensionInstall.installLink;
  }

  get isAuthenticated() {
    return this.session.isAuthenticated;
  }
}
