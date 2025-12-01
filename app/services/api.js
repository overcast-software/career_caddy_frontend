import Service from '@ember/service';
import { service } from '@ember/service';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

export default class ApiService extends Service {
  @service session;

  get baseUrl() {
    return buildBaseUrl();
  }

  headers() {
    if (!this.session.authorizationHeader) {
      return {};
    }
    return {
      Authorization: this.session.authorizationHeader
    };
  }
}
