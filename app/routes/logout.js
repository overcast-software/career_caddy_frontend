import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class LogoutRoute extends Route {
  @service session;
  @service router;

  beforeModel() {
    // session.invalidate() fires handleInvalidation, which clears the
    // store + closes SSE + transitions to /login. Don't pre-empt that
    // transition here — handleInvalidation is the single source of
    // truth for post-logout routing.
    return this.session.invalidate();
  }
}
