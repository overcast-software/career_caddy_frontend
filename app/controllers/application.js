import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { getOwner } from '@ember/application';
export default class ApplicationController extends Controller {
  @service session;
  @service store;
  @service flashMessages;
  @service currentUser;
  @service router;
  @tracked loading = false;

  get isProduction() {
    const cfg = getOwner(this).resolveRegistration('config:environment');
    return cfg && cfg.environment === 'production';
  }

  // Routes that render as a bare public page — no app chrome (sidebar /
  // top-bar / chat / footer). The public `/<username>` profile (CC #51) is a
  // shareable surface for anonymous visitors, so it must not expose the
  // authenticated app's navigation. `currentRouteName` is tracked on the
  // router service, so this getter re-evaluates as routes change.
  get chromeless() {
    return this.router.currentRouteName === 'profile';
  }

  @action
  async invalidateSession() {
    // session.invalidate() → handleInvalidation handles store cleanup
    // + SSE shutdown + routing centrally.
    await this.session.invalidate();
  }

  @action setLoading(loading) {
    this.loading = loading;
  }
  @tracked sidebarOpen = false;

  @action
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  @action
  closeSidebar() {
    this.sidebarOpen = false;
  }
}
