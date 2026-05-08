import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class WizardRoute extends Route {
  @service currentUser;

  async beforeModel() {
    // Refresh once on entry so children render against fresh
    // server-truth rather than the snapshot stamped at login.
    await this.currentUser.loadOnboarding();
  }
}
