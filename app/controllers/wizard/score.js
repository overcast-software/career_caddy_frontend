import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { setResumeStep } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardScoreController extends Controller {
  @service currentUser;
  @service extensionInstall;
  @service flashMessages;
  @service router;

  get onboarding() {
    return this.currentUser.onboarding;
  }

  get extensionPresent() {
    return this.currentUser.extensionPresent;
  }

  get installLink() {
    return this.extensionInstall.installLink;
  }

  /** Open the store URL in a new tab and finish the wizard for the
   * user. They can install at their leisure; the dashboard is the
   * right next surface. */
  @action
  async installAndFinish() {
    const link = this.installLink;
    if (link?.url) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
    await this._finish('Welcome aboard! Install the extension when ready.');
  }

  @action
  async skip() {
    await this._finish("You're all set up.");
  }

  async _finish(message) {
    await this.onboarding?.disableWizard();
    setResumeStep(null);
    this.flashMessages.success(message);
    this.router.transitionTo('job-posts.index');
  }
}
