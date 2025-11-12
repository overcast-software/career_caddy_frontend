import Component from '@glimmer/component';
import { service } from '@ember/service';
import { A } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';

export default class ResumesItemComponent extends Component {
  @service router;
  @service store;

  get canClone() {
    return this.router.currentRouteName === 'resumes.show';
  }

  get groups() {
    return Object.keys(this.groupedSkillsMap);
  }

  get groupedSkillsMap() {
    const skills = this.args.resume?.hasMany('skills')?.value() ?? [];
    const skillsArray = ArrayProxy.create({ content: skills });

    const result = skillsArray.reduce(function (current, skill) {
      const skillType = skill.skillType || 'Other';
      current[skillType] = current[skillType] || [];
      current[skillType].push(skill);
      return current;
    }, {});
    return result;
  }

  get hasSkills() {
    return this.groups.length > 0;
  }
}
