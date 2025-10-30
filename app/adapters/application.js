import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { service } from '@ember/service';
import config from 'career-caddy-frontend/config/environment';

export default class ApplicationAdapter extends JSONAPIAdapter {
  @service session;
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
    try {
      return await super.ajax(url, method, options);
    } catch (error) {
      if (error.status === 401 && this.session.refreshToken && !options._retried) {
        await this.session.refresh();
        options._retried = true;
        return await super.ajax(url, method, options);
      } else if (error.status === 401) {
        this.session.logout();
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
      return `${base.endsWith('/') ? base : base + '/' }?${query}`;
    }
    return `${url}/`;
  }
}
