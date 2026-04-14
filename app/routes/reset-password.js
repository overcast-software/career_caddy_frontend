import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResetPasswordRoute extends Route {
  @service health;

  async beforeModel() {
    await this.health.ensureHealthy();
  }

  resetController(controller, isExiting) {
    if (isExiting) {
      controller.token = null;
      controller.uid = null;
      controller.newPassword = '';
      controller.confirmPassword = '';
      controller.errorMessage = null;
      controller.success = false;
    }
  }
}
