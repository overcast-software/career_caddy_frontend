import Route from '@ember/routing/route';
import { service } from '@ember/service';
import {
  getProfession,
  getResumeStep,
  isExtensionPresent,
} from 'career-caddy-frontend/utils/wizard-storage';

export default class IndexRoute extends Route {
  @service currentUser;
  @service router;
  @service session;

  async beforeModel() {
    if (!this.session.isAuthenticated) return;
    if (!this.currentUser.user) return;

    // Branch into the wizard when the user lands here from the extension
    // post-install, or is mid-flow (sessionStorage cc:wizard-step set).
    // Anonymous "click the logo to go home" stays unaffected — the branch
    // only fires when one of those signals is present.
    const justInstalled = isExtensionPresent();
    const stepInProgress = getResumeStep();
    if (!justInstalled && !stepInProgress) return;

    await this.currentUser.loadOnboarding();
    const onboarding = this.currentUser.onboarding;
    if (!onboarding) return;

    const isStaff = Boolean(this.currentUser.user.isStaff);
    const profession = getProfession();
    if (!onboarding.isWizardActive({ isStaff, profession })) return;

    const step =
      stepInProgress || onboarding.currentStep({ isStaff, profession });
    if (step) this.router.replaceWith(`wizard.${step}`);
  }
}
