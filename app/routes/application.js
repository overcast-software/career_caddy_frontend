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
  @service publicRoutes;
  @service session;
  @service store;

  constructor() {
    super(...arguments);
    this._installBookmarkletStash();
  }

  _installBookmarkletStash() {
    if (typeof window === 'undefined') return;
    if (window.__ccBookmarkletStashInstalled) return;
    window.__ccBookmarkletStashInstalled = true;
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'cc-bookmarklet') {
        this._handleBookmarklet(event, data);
      } else if (data.type === 'cc-extension-present') {
        this._handleExtensionPresent(event);
      }
    });
  }

  _handleBookmarklet(event, data) {
    try {
      window.sessionStorage.setItem(
        'cc-pending-paste',
        JSON.stringify({
          url: typeof data.url === 'string' ? data.url : '',
          text: typeof data.text === 'string' ? data.text : '',
          at: Date.now(),
        }),
      );
    } catch {
      /* sessionStorage blocked — nothing we can do */
    }
    try {
      event.source?.postMessage('cc-bookmarklet-ack', event.origin || '*');
    } catch {
      /* best-effort ack */
    }
    const onPaste = this.router.currentRouteName === 'job-posts.new.paste';
    if (!onPaste && this.session.isAuthenticated) {
      this.router.transitionTo('job-posts.new.paste');
    }
  }

  _handleExtensionPresent(event) {
    try {
      window.sessionStorage.setItem('cc:extension-present', 'true');
    } catch {
      /* sessionStorage blocked — nothing we can do */
    }
    try {
      event.source?.postMessage(
        'cc-extension-present-ack',
        event.origin || '*',
      );
    } catch {
      /* best-effort ack */
    }
  }

  async beforeModel(transition) {
    // Set up ESA's event handlers exactly once — calling setup() multiple times
    // registers duplicate listeners on the internal event emitter.
    if (!this.session._setupIsCalled) {
      await this.session.setup();
    }

    const routeName = transition.to?.name;
    if (this.publicRoutes.isPublic(routeName)) {
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
      this.flashMessages.warning(
        'That page is only visible to signed-in users — here are the docs instead. Sign in (top right) to see your own data.',
        { sticky: true },
      );
      this.router.transitionTo(`docs.${baseRoute}`);
    } else {
      this.router.transitionTo('login');
    }
  }
}
