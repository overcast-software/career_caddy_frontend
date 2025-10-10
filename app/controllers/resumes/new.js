import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ResumesNewController extends Controller {
  @service store;
  @service router;

  addExperience = async () => {
    const exp = this.store.createRecord('experience', { resume: this.model });
    const rel = await this.model.experiences;
    if (!rel.includes(exp)) rel.pushObject(exp);
  };

  addCertification = async () => {
    const cert = this.store.createRecord('certification', { resume: this.model });
    const rel = await this.model.certifications;
    if (!rel.includes(cert)) rel.pushObject(cert);
  };

}
