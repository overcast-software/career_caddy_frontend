import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class LoginRoute extends Route {
  @service session;
  @service health;

  async beforeModel() {
    await this.health.ensureHealthy();
  }
}
