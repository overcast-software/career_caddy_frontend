import JSONAPIAdapter from '@ember-data/adapter/json-api';
import config from 'career-caddy-frontend/config/environment';

export default class ApplicationAdapter extends JSONAPIAdapter {
  get host() {
    return config.APP.API_HOST || undefined;
  }
  namespace = config.APP.API_NAMESPACE;
}
