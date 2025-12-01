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

  async ajax(url, method, options = {}) {
    // Preflight token refresh for write operations
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      try {
        await this.session.ensureFreshToken(90);
      } catch (error) {
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
          } catch (refreshError) {
            // Refresh failed, proceed with logout
          }
        }
        await this.session.invalidate();
        this.router.transitionTo('login');
      }
      throw error;
    }
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
