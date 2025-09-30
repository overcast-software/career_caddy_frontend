import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ExperiencesItemComponent extends Component {
  @service router;

  get experience() {
    return this.args.experience ?? this.args.model;
  }

  @action edit() {
    const exp = this.experience;
    const resumeId = exp.belongsTo('resume').id();
    this.router.transitionTo('resumes.show.experience.edit', resumeId, exp.id);
  }

  @action async delete() {
    const exp = this.experience;
    const resumeId = exp.belongsTo('resume').id();
    await exp.destroyRecord();
    this.router.transitionTo('resumes.show.experience.index', resumeId);
  }
}
