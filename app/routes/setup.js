import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SetupRoute extends Route {
  @service health;
  @service router;

  async beforeModel() {
    const healthy = await this.health.ensureHealthy();
    if (healthy) {
      this.router.transitionTo('index');
    }
  }

  model() {
    return {
      name: '',
      email: '',
      phone: '',
      username: '',
      password: '',
    };
  }
}
