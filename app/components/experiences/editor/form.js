import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { toCalendarString } from 'career-caddy-frontend/utils/tz';

export default class ExperiencesEditorForm extends Component {
  @service store;
  @service flashMessages;

  @tracked errorMessage = null;
  @tracked isExpanded = false;
  @tracked currentlyWorking = false;

  constructor() {
    super(...arguments);
    this.currentlyWorking = !this.args.experience?.endDate;
    if (this.args.experience?.isNew) {
      this.isExpanded = true;
    }
  }

  get formattedStartDate() {
    return toCalendarString(this.args.experience?.startDate);
  }

  get formattedEndDate() {
    return toCalendarString(this.args.experience?.endDate);
  }

  @action updateField(field, event) {
    if (field === 'startDate' || field === 'endDate') {
      if (field === 'endDate' && this.currentlyWorking) return;
      // Keep as "YYYY-MM-DD" string; valueAsDate would coerce to UTC midnight
      // and the serializer would then shift it back a day for PST users.
      this.args.experience[field] = event.target.value || null;
    } else {
      this.args.experience[field] = event.target.value;
    }
  }

  @action toggleExperience() {
    this.isExpanded = !this.isExpanded;
  }

  @action toggleCurrentlyWorking(event) {
    this.currentlyWorking = event.target.checked;
    if (this.currentlyWorking) {
      this.args.experience.endDate = null;
    }
  }

  @action save(event) {
    event?.preventDefault?.();
    if (this.currentlyWorking) {
      this.args.experience.endDate = null;
    }
    this.args.experience
      .save()
      .then(() => this.flashMessages.success('Experience saved.'))
      .catch((e) => {
        this.errorMessage = e?.message ?? 'Failed to save experience';
      });
  }

  @action cancel() {
    if (this.args.experience?.isNew) {
      this.args.experience.rollbackAttributes();
    }
    this.isExpanded = false;
  }

  @action deleteExperience() {
    this.args.experience
      .destroyRecord()
      .then(() => this.flashMessages.success('Experience deleted.'))
      .catch((e) => {
        this.errorMessage = e?.message ?? 'Failed to delete experience';
      });
  }

  @action addDescription() {
    const exp = this.args.experience;
    if (!exp) return;

    const descriptions = exp.descriptions;
    const nextOrder =
      (descriptions?.toArray?.()?.length ??
        (Array.isArray(descriptions) ? descriptions.length : 0)) + 1;

    const desc = this.store.createRecord('description', {
      content: '',
      order: nextOrder,
      experience: exp,
    });

    descriptions?.pushObject?.(desc);
  }

  @action removeDescription(desc) {
    if (!desc) return;
    this.args.experience?.descriptions?.removeObject?.(desc);

    if (desc.isNew) {
      desc.unloadRecord?.();
    } else {
      desc.destroyRecord();
    }
  }
}
