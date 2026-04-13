import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

export default class ResumesItemComponent extends Component {
  get groups() {
    return Object.keys(this.groupedSkillsMap);
  }

  @cached get groupedSkillsMap() {
    const result = {};
    this.args.resume?.skills?.forEach((skill) => {
      const skillType = skill.skillType || 'Other';
      result[skillType] = result[skillType] || [];
      result[skillType].push(skill);
    });
    return result;
  }

  get hasSkills() {
    return this.groups.length > 0;
  }

  get activeSummary() {
    const summaries = this.args.resume?.summaries;
    const len = summaries?.length ?? 0;
    for (let i = 0; i < len; i++) {
      const s = summaries.objectAt ? summaries.objectAt(i) : summaries[i];
      if (s?.active) return s;
    }
    return null;
  }
}
