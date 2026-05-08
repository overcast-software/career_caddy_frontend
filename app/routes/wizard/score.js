import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { setResumeStep } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardScoreRoute extends Route {
  @service currentUser;
  @service router;
  @service flashMessages;

  async beforeModel() {
    if (!this.currentUser.user?.isStaff) {
      // Non-staff skip scoring per Phase 2's staff-gate. Disable the
      // wizard, clear the step pointer so future navigations don't
      // re-fetch onboarding, and land on the dashboard.
      this.flashMessages.success(
        "You're all set up! Sample scoring is staff-only during alpha.",
      );
      await this.currentUser.onboarding?.disableWizard();
      setResumeStep(null);
      this.router.replaceWith('job-posts.index');
    }
  }

  activate() {
    setResumeStep('score');
  }
}
