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
   * a bare `/api/v1/...` resolves against the page origin. In the default
   * same-origin prod topology (apex serves both the SPA and /api/*) that
   * happens to be correct, but a self-hoster who splits the API onto a
   * separate host would have the frontend's proxy serve index.html for the
   * unknown route and the caller chokes on HTML. Always go through
   * api.url(path) (it prepends config.APP.API_HOST) so this can't recur. */
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
