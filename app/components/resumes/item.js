import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ResumesItemComponent extends Component {
  @service router;

  get activeExperienceId() {
    return this.router.currentRoute?.params?.experience_id;
  }

  isEditingExperience = (experience) => {
    return this.activeExperienceId && String(experience?.id) === String(this.activeExperienceId);
  }

  @action
  async submitResume() {
    const resume = this.args.resume;
    const toArray = (rel) =>
      rel && typeof rel.toArray === 'function' ? rel.toArray() : rel ? [rel] : [];
    const payload = {
      resume,
      summary: resume?.summary,
      experiences: toArray(resume?.experiences),
      educations: toArray(resume?.educations),
      certifications: toArray(resume?.certifications),
    };
    // TODO: for now, just log and break here
    // eslint-disable-next-line no-debugger
    debugger;
     
    console.log('Submit resume payload', payload);
  }
}
