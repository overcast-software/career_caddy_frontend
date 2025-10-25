import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service store;
  @service router;
  @service health;
  @service session;

  async beforeModel(transition) {
    // Skip health check for setup and login routes
    const routeName = transition.to?.name;
    if (routeName === 'setup' || routeName === 'login') {
      return;
    }

    const ok = await this.health.ensureHealthy();
    if (!ok) {
        this.router.transitionTo('setup');
        return;
    }

    // Enforce authentication for protected routes
    if (routeName !== 'index' && !this.session.isAuthenticated) {
      this.router.transitionTo('login');
    }
  }
}
