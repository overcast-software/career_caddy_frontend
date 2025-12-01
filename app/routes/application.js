import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service store;
  @service currentUser;
  @service router;
  @service health;
  @service session;
  healthy = false;
  get unhealthy() {
    return !this.healthy;
  }

  async beforeModel(transition) {
    // Skip health check for setup and login routes
    const routeName = transition.to?.name;
    if (routeName === 'setup' || routeName === 'login') {
      return;
    }

    const ok = await this.health.ensureHealthy();
    if (!ok || this.health.bootstrapOpen) {
      this.router.transitionTo('setup');
      return;
    }

    // Restore session before checking authentication
    await this.session.setup();

    // Enforce authentication for protected routes
    if (routeName !== 'index' && !this.session.isAuthenticated) {
      this.router.transitionTo('login');
      return; // IMPORTANT: abort further processing and the original transition
    }

    this.healthy = true;
    
    // Start activity watching and ensure fresh token
    if (this.session.isAuthenticated) {
      this.session.startActivityWatch();
      try {
        await this.session.ensureFreshToken(90);
      } catch (error) {
        console.warn('Initial token refresh failed:', error);
      }
    }
    
    return this._loadCurrentUser();
  }

  async _loadCurrentUser() {
    try {
      await this.currentUser.load();
    } catch (err) {
      console.log(err);
      await this.session.invalidate();
    }
  }
}
