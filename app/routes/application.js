import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service currentUser;
  @service router;
  @service health;
  @service session;

  async beforeModel(transition) {
    // Set up ESA's event handlers exactly once — calling setup() multiple times
    // registers duplicate listeners on the internal event emitter.
    if (!this.session._setupIsCalled) {
      await this.session.setup();
    }

    const routeName = transition.to?.name;
    const isPublic =
      routeName === 'setup' ||
      routeName === 'login' ||
      routeName === 'about' ||
      (routeName && routeName.startsWith('docs'));
    if (isPublic) {
      return;
    }

    const ok = await this.health.ensureHealthy();
    if (!ok || this.health.bootstrapOpen) {
      this.router.transitionTo('setup');
      return;
    }

    if (routeName !== 'index' && !this.session.isAuthenticated) {
      transition.abort();
      this.router.transitionTo('login');
      return;
    }

    if (this.session.isAuthenticated) {
      this.session.startActivityWatch();
      try {
        await this.session.ensureFreshToken(90);
      } catch (error) {
        console.warn('Initial token refresh failed:', error);
      }
    }

    try {
      await this.currentUser.load();
    } catch {
      await this.session.invalidate();
    }

    if (this.currentUser.isGuest) {
      const writeRoutes = ['.new', '.edit', '.scrape', '.import'];
      if (writeRoutes.some((suffix) => routeName?.endsWith(suffix))) {
        transition.abort();
        this.router.transitionTo('index');
      }
    }
  }
}
