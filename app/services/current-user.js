import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { decodeUserId } from 'career-caddy-frontend/utils/jwt';

export default class CurrentUserService extends Service {
  @service session;
  @service store;
  @tracked user = null;

  get isGuest() {
    return this.user?.isGuest ?? false;
  }

  async load() {
    this.user = null;
    if (!this.session.isAuthenticated) return;

    const token = this.session.accessToken;
    const userId = token ? decodeUserId(token) : null;
    if (!userId) return;

    this.user = await this.store.findRecord('user', userId);
  }
}
