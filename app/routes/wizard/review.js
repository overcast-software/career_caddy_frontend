import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { setResumeStep } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardReviewRoute extends Route {
  @service store;

  activate() {
    setResumeStep('review');
  }

  async model() {
    const resumes = await this.store.findAll('resume');
    // Most-recent first so a freshly-imported resume floats to the top.
    return resumes
      .slice()
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }
}
