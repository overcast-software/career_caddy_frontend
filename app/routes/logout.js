import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class LogoutRoute extends Route {
  @service session;
  @service router;
  beforeModel() {
    //ensure invalidate
    debugger;
    this.session.authService
      .invalidate({})
      .then(() => this.router.transistionTo('index'));
  }
}
