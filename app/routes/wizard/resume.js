import Route from '@ember/routing/route';
import { setResumeStep } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardResumeRoute extends Route {
  activate() {
    setResumeStep('resume');
  }
}
