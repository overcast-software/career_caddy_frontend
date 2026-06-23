import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { service } from '@ember/service';
import config from 'career-caddy-frontend/config/environment';

export default class ApplicationAdapter extends JSONAPIAdapter {
  @service session;
  @service flashMessages;
  @service router;

  get host() {
    return config.APP.API_HOST || undefined;
  }
  namespace = config.APP.API_NAMESPACE;

  get headers() {
    if (this.session.authorizationHeader) {
      return { Authorization: this.session.authorizationHeader };
    }
    return {};
  }

  // Integration tests mount components without a routing microlib;
  // transitionTo in that context throws on this._routerMicrolib. Swallow.
  _safeTransitionTo(route) {
    try {
      this.router.transitionTo(route);
    } catch {
      // no router in integration test env
    }
  }

  // Public, unauthenticated-readable endpoints (AllowAny on the api). These
  // must reach the api while logged OUT, so they bypass the short-circuit in
  // ajax() below. Today: the /<username> profile surface (CC #51) — the user
  // resource and that user's federated (audience-public) job-posts feed.
  //
  // We key off the request URL, NOT the current route name, on purpose:
  // during the initial transition into /<username> the router hasn't settled
  // currentRouteName yet (the auth guard itself reads transition.to.name for
  // the same reason), but the request URL is always known here. Extend this
  // list as more public reads land.
  _isPublicEndpoint(url) {
    return /\/users\/[^/]+\/(job-posts\/federated\/)?($|\?)/.test(url);
  }

  async ajax(url, method, options = {}) {
    // No auth + a PROTECTED endpoint → don't hit the api. Map the resource to
    // its /docs page (or /login) and short-circuit with an empty payload.
    // Public endpoints (see _isPublicEndpoint) are exempt: they go out
    // unauthenticated (the `headers` getter omits Authorization when there's
    // no token) and a logged-in viewer's JWT, if present, is simply ignored by
    // the AllowAny endpoint. A real 401 from a protected endpoint still falls
    // through to the refresh/login handling below.
    if (!this.session.isAuthenticated && !this._isPublicEndpoint(url)) {
      const docsMap = {
        scores: 'docs.scores',
        summaries: 'docs.summaries',
        questions: 'docs.questions',
        answers: 'docs.answers',
        'career-data': 'docs.career-data',
        'job-posts': 'docs.job-posts',
        'job-applications': 'docs.job-applications',
        companies: 'docs.companies',
        resumes: 'docs.resumes',
        'cover-letters': 'docs.cover-letters',
        scrapes: 'docs.scrapes',
      };
      const match = url.match(/\/api\/v1\/([a-z-]+)/);
      const resource = match?.[1];
      const docsRoute = resource && docsMap[resource];
      if (docsRoute) {
        this.flashMessages.info(
          'Looking for your data? Sign in using the button in the top right.',
        );
        this._safeTransitionTo(docsRoute);
      } else {
        this._safeTransitionTo('login');
      }
      return { data: [] };
    }

    // Preflight token refresh for write operations
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      try {
        await this.session.ensureFreshToken(90);
      } catch {
        // Let it proceed - the 401 handler below will catch and retry
      }
    }

    try {
      return await super.ajax(url, method, options);
    } catch (error) {
      if (error.status === 401) {
        if (!options._retried && this.session.refreshToken) {
          try {
            await this.session.refresh();
            options._retried = true;
            return await super.ajax(url, method, options);
          } catch {
            // Refresh failed, proceed with logout
          }
        }
        await this.session.invalidate();
        this._safeTransitionTo('login');
      }
      if (error.status === 403) {
        this.flashMessages.warning(
          'You don\u2019t have permission to do that. Sign in with a full account.',
          { sticky: true },
        );
      }
      throw error;
    }
  }

  // Extend the default JSON:API buildQuery (which only emits `include`)
  // so callers can pass sparse fieldsets through `adapterOptions.fields`:
  //   findRecord('scrape', id, { adapterOptions: { fields: { scrape: 'url,status,...' } } })
  buildQuery(snapshot) {
    const query = super.buildQuery(snapshot);
    const fields = snapshot?.adapterOptions?.fields;
    if (fields) {
      for (const [type, fieldList] of Object.entries(fields)) {
        query[`fields[${type}]`] = fieldList;
      }
    }
    return query;
  }

  buildURL(...args) {
    let url = super.buildURL(...args);
    if (url.endsWith('/')) return url;
    if (url.includes('?')) {
      const [base, query] = url.split('?');
      return `${base.endsWith('/') ? base : base + '/'}?${query}`;
    }
    return `${url}/`;
  }
}
