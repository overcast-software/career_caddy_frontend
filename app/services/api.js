import Service from '@ember/service';
import { service } from '@ember/service';
import config from 'career-caddy-frontend/config/environment';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

export default class ApiService extends Service {
  @service session;

  get baseUrl() {
    return buildBaseUrl();
  }

  /** Build an absolute API URL from an /api/v1-style path.
   *
   * Routes that bypass Ember Data (raw `fetch`) need an absolute URL —
   * a bare `/api/v1/...` resolves against the page origin, which in prod
   * is the frontend host (careercaddy.online), not the API host
   * (api.careercaddy.online). The frontend's Caddy then serves index.html
   * for unknown routes and the caller chokes on HTML. Always go through
   * api.url(path) so this can't recur. */
  url(path) {
    const host = (config.APP.API_HOST ?? '').replace(/\/+$/, '');
    if (!path) return host;
    return path.startsWith('/') ? `${host}${path}` : `${host}/${path}`;
  }

  headers() {
    if (!this.session.authorizationHeader) {
      return {};
    }
    return {
      Authorization: this.session.authorizationHeader,
    };
  }
}
