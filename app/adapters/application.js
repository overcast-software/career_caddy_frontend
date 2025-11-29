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
    if (this.session.isAuthenticated && this.session.data.authenticated.access) {
      return { Authorization: `Bearer ${this.session.data.authenticated.access}` };
    }
    return {};
  }

  async ajax(url, method, options = {}) {
    try {
      return await super.ajax(url, method, options);
    } catch (error) {
      if (error.status === 401) {
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
