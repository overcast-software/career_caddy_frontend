import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SkillsFormComponent extends Component {
  @tracked newSkill = '';

  get skills() {
    return this.args.skills ?? [];
  }

  get lineCount() {
    const value = this.args.skill ? (this.args.skill.text ?? '') : (this.newSkill ?? '');
    return Math.max(1, String(value).split('\n').length);
  }

  @action updateNewSkill(event) {
    this.newSkill = event.target.value;
  }

  @action updateSkill(event) {
    let value = event?.target?.value ?? '';
    // strip any whitespace on the left
    value = value.replace(/^\s+/, '');
    // reflect the trimmed value in the input immediately
    if (event?.target) {
      event.target.value = value;
    }
    if (this.args.skill) {
      // update a passed-in skill model/object
      this.args.skill.text = value;
    } else {
      // fallback if used for creating a new skill entry
      this.newSkill = value;
    }
  }
  @action addSkill() {
    // prefer the current source of truth
    let s = this.args.skill ? (this.args.skill.text ?? '') : (this.newSkill ?? '');
    // left-trim only (per requirement)
    s = s.replace(/^\s+/, '').trimEnd ? s.replace(/^\s+/, '') : s; // ensure only left trim
    if (!s) return;

    if (this.skills.pushObject) {
      this.skills.pushObject(s);
    } else {
      this.skills.push(s);
    }

    // clear input
    if (this.args.skill) {
      this.args.skill.text = '';
    } else {
      this.newSkill = '';
    }
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
