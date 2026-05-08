import Route from '@ember/routing/route';
import { setResumeStep } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardProfessionRoute extends Route {
  activate() {
    setResumeStep('profession');
  }
}
