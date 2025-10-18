import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ResumesShowController extends Controller {
  @service store;
  @service router;

  get isDirty() {
    return this.model?.isNew || this.model?.hasDirtyAttributes;
  }

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

  @action
  async saveResume() {
    try {
      await this.model.save();
    } catch (e) {
      // Optional: surface error to the user
       
      console.error('Failed to save resume', e);
    }
  }

  @action
  async deleteResume() {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    await this.model.destroyRecord();
    this.router.transitionTo('resumes');
  }

  addExperience = async () => {
    const exp = this.store.createRecord('experience', { resume: this.model });
    const rel = await this.model.experiences;
    if (!rel.includes(exp)) rel.unshiftObject(exp);
  };

}
