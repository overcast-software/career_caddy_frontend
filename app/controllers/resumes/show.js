import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ResumesShowController extends Controller {
  @service store;
  @service router;

  @action
  async cloneResume() {
    const source = this.model;
    const user = await source.user
    this.store.createRecord('resume', {
        user,
        title: source.title ? `${source.title} (Copy)` : source.title,
        content: source.content ?? null,
        filePath: source.filePath ?? null,
        educations: source.hasMany("educations").value(),
        experiences: source.hasMany("experiences").value(),
        certifications: source.hasMany("certifications").value(),
        summaries: source.hasMany("summaries").value()
    })
    .save()
    .then( (c) => {
        this.router.transitionTo('resumes.show', c.id)
    })
    }
  addExperience = async () => {
    const exp = this.store.createRecord('experience', { resume: this.model });
    const rel = await this.model.experiences;
    if (!rel.includes(exp)) rel.pushObject(exp);
  };

}
