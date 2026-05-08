import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { setResumeStep } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardReviewController extends Controller {
  @service currentUser;
  @service router;
  @service flashMessages;

  @tracked saving = false;

  get onboarding() {
    return this.currentUser.onboarding;
  }

  @action
  async confirm() {
    if (this.saving) return;
    this.saving = true;
    try {
      await this.onboarding?.markResumeReviewed();
      const isStaff = Boolean(this.currentUser.user?.isStaff);
      const next = isStaff ? 'wizard.score' : 'job-posts.index';
      if (next === 'job-posts.index') {
        this.flashMessages.success("You're all set — happy hunting.");
        await this.onboarding?.disableWizard();
        setResumeStep(null);
      }
      this.router.transitionTo(next);
    } finally {
      this.saving = false;
    }
  }
}
