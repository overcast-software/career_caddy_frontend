import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SkillsFormComponent extends Component {
  @tracked newSkill = '';

  get skills() {
    return this.args.skills ?? [];
  }

  @action updateNewSkill(event) {
    this.newSkill = event.target.value;
  }

  @action addSkill() {
    const s = (this.newSkill ?? '').trim();
    if (!s) return;
    if (this.skills.pushObject) {
      this.skills.pushObject(s);
    } else {
      this.skills.push(s);
    }
    this.newSkill = '';
  }

  @action removeSkill(skill) {
    if (this.skills.removeObject) {
      this.skills.removeObject(skill);
    } else {
      const i = this.skills.indexOf(skill);
      if (i > -1) this.skills.splice(i, 1);
    }
  }
}
