import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { PROFESSION_OPTIONS } from 'career-caddy-frontend/components/resumes/title/form';
import {
  getProfession,
  setProfession,
} from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardProfessionController extends Controller {
  @service flashMessages;
  @service router;

  professionOptions = PROFESSION_OPTIONS;

  @tracked _profession;

  get profession() {
    if (this._profession !== undefined) return this._profession;
    return getProfession() || '';
  }

  @action
  updateProfession(event) {
    this._profession = event.target.value;
  }

  @action
  next(event) {
    event?.preventDefault?.();
    if (!this.profession) return;
    setProfession(this.profession);
    this.router.transitionTo('wizard.resume');
  }
}
