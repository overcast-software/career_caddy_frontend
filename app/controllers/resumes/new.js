import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import cloneResume from 'career-caddy-frontend/utils/clone-resume';

export default class ResumesNewController extends Controller {
  @service store;
  @service router;
  @service flashMessages;

  addExperience = async () => {
    const exp = this.store.createRecord('experience', { resume: this.model });
    const rel = await this.model.experiences;
    if (!rel.includes(exp)) rel.pushObject(exp);
  };

  addCertification = async () => {
    const cert = this.store.createRecord('certification', {
      resume: this.model,
    });
    const rel = await this.model.certifications;
    if (!rel.includes(cert)) rel.pushObject(cert);
  };

  @action
  async cloneResume() {
    if (this.model.isNew) {
      this.flashMessages.warning('Save the resume before cloning');
      return;
    }
    await cloneResume(this.store, this.router, this.flashMessages, this.model.id);
  }
}
