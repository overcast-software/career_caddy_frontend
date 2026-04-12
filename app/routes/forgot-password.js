import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ForgotPasswordRoute extends Route {
  @service health;

  async beforeModel() {
    await this.health.ensureHealthy();
  }
}
