import Service from 'ember-simple-auth/services/session';
import { service } from '@ember/service';
import { getOwner } from '@ember/application';

export default class SessionService extends Service {
  @service router;

  get accessToken() {
    return this.data?.authenticated?.access || null;
  }

  get refreshToken() {
    return this.data?.authenticated?.refresh || null;
  }

  get authorizationHeader() {
    return this.accessToken ? `Bearer ${this.accessToken}` : null;
  }

  async refresh() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const authenticator = getOwner(this).lookup('authenticator:jwt');
    const newData = await authenticator.refresh(this.data.authenticated);
    this.set('data.authenticated', newData);
    authenticator.scheduleRefresh(newData);
    return newData;
  }

  handleAuthentication(transition) {
    if (transition) {
      transition.retry();
    } else {
      this.router.transitionTo('index');
    }
  }

  handleInvalidation() {
    this.router.transitionTo('login');
  }
}
