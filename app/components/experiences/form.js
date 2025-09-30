import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ExperiencesFormComponent extends Component {
  @service router;
  @tracked errorMessage = null;

  get experience() {
    return this.args.experience ?? this.args.model;
  }

  @action updateField(field, event) {
    if (field === 'startDate' || field === 'endDate') {
      this.experience[field] = event.target.valueAsDate ?? null;
    } else {
      this.experience[field] = event.target.value;
    }
  }

  @action async save(event) {
    event?.preventDefault();
    try {
      await this.experience.save();
      const resumeId = this.experience.belongsTo('resume').id();
      this.router.transitionTo('resumes.show.experience.show', resumeId, this.experience.id);
    } catch (e) {
      this.errorMessage = e?.message ?? 'Failed to save experience';
    }
  }

  @action cancel() {
    if (this.experience?.isNew) this.experience.rollbackAttributes();
    const resumeId = this.experience?.belongsTo('resume')?.id() ?? this.args.resume?.id;
    this.router.transitionTo('resumes.show.experience.index', resumeId);
  }
}
