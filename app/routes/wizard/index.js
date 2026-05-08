import Route from '@ember/routing/route';
import { service } from '@ember/service';
import {
  getProfession,
  getResumeStep,
} from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardIndexRoute extends Route {
  @service currentUser;
  @service router;

  redirect() {
    const persisted = getResumeStep();
    if (persisted) {
      this.router.replaceWith(`wizard.${persisted}`);
      return;
    }
    const onboarding = this.currentUser.onboarding;
    if (!onboarding) {
      this.router.replaceWith('wizard.profession');
      return;
    }
    const step = onboarding.currentStep({
      isStaff: Boolean(this.currentUser.user?.isStaff),
      profession: getProfession(),
    });
    this.router.replaceWith(`wizard.${step || 'profession'}`);
  }
}
