import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import ArrayProxy from '@ember/array/proxy';

export default class SkillsFormComponent extends Component {
  @service store;

  @tracked newSkillText = '';
  @tracked newSkillType = '';

  get skills() {
    return this.args.skills ?? [];
  }

  get groupedSkillsMap() {
    const skillsArray = ArrayProxy.create({ content: this.skills.content });

    const result = skillsArray.reduce(function (current, skill) {
      const skillType = skill.skillType || 'Other';
      current[skillType] = current[skillType] || [];
      current[skillType].push(skill);
      return current;
    }, {});
    return result;
  }

  @action updateNewSkillText(event) {
    this.newSkillText = event.target.value;
  }

  @action updateNewSkillType(event) {
    this.newSkillType = event.target.value;
  }

  @action async addSkill() {
    const text = this.newSkillText.trim();
    if (!text) return;

    const typeRaw = (this.newSkillType ?? '').trim();

    if (!this.args.resume) {
      console.warn('No resume provided to Skills::Form component');
      return;
    }

    try {
      // Save resume first if it's new
      if (this.args.resume.isNew) {
        await this.args.resume.save();
      }

      // Create the skill record
      const rec = this.store.createRecord('skill', {
        text,
        skillType: typeRaw || null,
        resume: this.args.resume,
      });

      await rec.save();

      // Clear the text input on success
      this.newSkillText = '';
      // Keep skillType to ease adding multiple skills in same group
    } catch (error) {
      console.error('Failed to add skill:', error);
      // Keep inputs unchanged on failure
    }
  }

  @action async removeSkill(skill) {
    try {
      if (skill.destroyRecord) {
        await skill.destroyRecord();
      } else {
        // Fallback for non-Ember Data objects
        if (this.skills.removeObject) {
          this.skills.removeObject(skill);
        } else {
          const i = this.skills.indexOf(skill);
          if (i > -1) this.skills.splice(i, 1);
        }
      }
    } catch (error) {
      console.error('Failed to remove skill:', error);
      // Keep the tag on failure
    }
  }
}
