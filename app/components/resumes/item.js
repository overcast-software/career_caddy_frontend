import Component from '@glimmer/component';

export default class ResumesItemComponent extends Component {
  get sortedExperiences() {
    return this.args.resume.sortedExperiences;
  }

  get groupedSkillsMap() {
    const skills = this.args.resume.hasMany('skills').value();
    if (!skills) return {};
    const result = {};
    for (const skill of skills) {
      const skillType = skill.skillType || 'Other';
      result[skillType] = result[skillType] || [];
      result[skillType].push(skill);
    }
    return result;
  }

  get hasSkills() {
    return Object.keys(this.groupedSkillsMap).length > 0;
  }

  get activeSummary() {
    return this.args.activeSummary ?? this.args.resume.activeSummary;
  }
}
