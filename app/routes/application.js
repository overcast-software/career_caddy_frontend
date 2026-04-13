import Route from '@ember/routing/route';
import { service } from '@ember/service';

const DOCS_ROUTES = new Set([
  'scores',
  'summaries',
  'questions',
  'answers',
  'career-data',
  'job-posts',
  'job-applications',
  'companies',
  'resumes',
  'cover-letters',
  'scrapes',
]);

export default class ApplicationRoute extends Route {
  @service currentUser;
  @service flashMessages;
  @service router;
  @service health;
  @service session;
  @service store;

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
      routeName === 'waitlist' ||
      routeName === 'forgot-password' ||
      routeName === 'reset-password' ||
      routeName === 'accept-invite' ||
      routeName === 'signup' ||
      routeName === 'about' ||
      (routeName && routeName.startsWith('docs'));
    if (isPublic) {
      return;
    }

    // ESA's requireAuthentication: checks session, stores attemptedTransition,
    // and calls our redirect callback if not authenticated.
    if (routeName !== 'index') {
      const isAuthed = this.session.requireAuthentication(transition, () => {
        this._redirectUnauthenticated(routeName);
      });
      if (!isAuthed) return;
    }

    const ok = await this.health.ensureHealthy();
    if (!ok || this.health.bootstrapOpen) {
      return this.router.replaceWith('setup');
    }

    this.session.startActivityWatch();
    try {
      await this.session.ensureFreshToken(90);
    } catch (error) {
      console.warn('Initial token refresh failed:', error);
    }

    try {
      await this.currentUser.load();
    } catch {
      await this.session.invalidate();
      this.store.unloadAll();
      this._redirectUnauthenticated(routeName);
      return;
    }

    if (this.currentUser.isGuest) {
      const writeRoutes = ['.new', '.edit', '.scrape', '.import'];
      const guestBlocked =
        routeName === 'caddy' ||
        writeRoutes.some((suffix) => routeName?.endsWith(suffix));
      if (guestBlocked) {
        this.flashMessages.warning(
          'This feature requires a full account. Sign in to access it.',
          { sticky: true },
        );
        return this.router.replaceWith('index');
      }
    }
  }

  _redirectUnauthenticated(routeName) {
    const baseRoute = routeName?.split('.')[0];
    if (DOCS_ROUTES.has(baseRoute)) {
      this.flashMessages.info(
        'Looking for your data? Sign in using the button in the top right.',
      );
      this.router.transitionTo(`docs.${baseRoute}`);
    } else {
      this.router.transitionTo('login');
    }
  }
}
