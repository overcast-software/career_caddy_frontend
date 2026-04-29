import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { service } from '@ember/service';
import config from 'career-caddy-frontend/config/environment';

export default class ApplicationAdapter extends JSONAPIAdapter {
  @service session;
  @service flashMessages;
  @service router;
  @service onboarding;

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

  async ajax(url, method, options = {}) {
    // No auth → no API call. Extract resource from the URL and redirect.
    if (!this.session.isAuthenticated) {
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

  async createRecord(store, type, snapshot) {
    const result = await super.createRecord(store, type, snapshot);
    try {
      this.onboarding?.noteRecordCreated(type.modelName);
    } catch {
      // Onboarding telemetry is best-effort — never block a save.
    }
    return result;
  }

  async updateRecord(store, type, snapshot) {
    const result = await super.updateRecord(store, type, snapshot);
    if (type.modelName === 'user') {
      try {
        this.onboarding?.noteProfileSaved();
      } catch {
        // best-effort
      }
    }
    return result;
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
