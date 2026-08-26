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
   * Routes that bypass Ember Data (raw `fetch`) must go through here rather
   * than hardcoding `/api/v1/...`, because API_HOST is not the same in every
   * environment. In prod it is EMPTY — the api is served same-origin under
   * the apex (careercaddy.online/api/v1/...), so a bare path happens to work.
   * Where API_HOST is set to a different origin, a bare path resolves against
   * the page origin instead, the SPA's server answers with index.html for the
   * unknown route, and the caller chokes on HTML. api.url(path) is correct in
   * both cases.
   *
   * The old api.careercaddy.online subdomain was retired at the GCP cutover
   * (CC-188) and no longer resolves — don't reintroduce it. */
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
