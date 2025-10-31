import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ExperiencesEditorForm extends Component {
  @service router;
  @service store;
  @tracked errorMessage = null;
  @tracked editingDesc = null;
  @tracked editingDraft = '';
  @tracked isExpanded = true;
  @tracked currentlyWorking = false;

  constructor() {
    super(...arguments);
    this.currentlyWorking = !this.experience?.endDate;
  }

  get experience() {
    return this.args.experience ?? this.args.model;
  }

  get resumeId() {
    return this.experience.resume.id;
  }

  get formattedStartDate() {
    const d = this.experience?.startDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  get formattedEndDate() {
    const d = this.experience?.endDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  get companyDisplayName() {
    const c = this.experience?.company;
    return (c?.displayName || c?.name || '') ?? '';
  }

  get orderedDescriptions() {
    const rel = this.experience?.descriptions;
    const arr = rel?.toArray?.() ?? Array.from(rel ?? []);
    return arr.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  @action updateField(field, event) {
    if (field === 'startDate' || field === 'endDate') {
      if (field === 'endDate' && this.currentlyWorking) {
        return; // no-op when currently working
      }
      this.experience[field] = event.target.valueAsDate ?? null;
    } else if (field === 'content' && event?.target?.isContentEditable) {
      this.experience.content = event.target.innerHTML;
    } else {
      this.experience[field] = event.target.value;
    }
  }

  @action async deleteExperience() {
    try {
      const resumeId = this.experience?.belongsTo?.('resume')?.id?.();
      const resume = this.experience?.belongsTo?.('resume')?.value?.();

      resume.removeObject(this.experience);

      await this.experience.destroyRecord();
      this.router.transitionTo('resumes.show.experience.index', resumeId);
    } catch (e) {
      this.errorMessage = e?.message ?? 'Failed to delete experience';
    }
  }

  @action async save(event) {
    event?.preventDefault();
    try {
      if (this.currentlyWorking) {
        this.experience.endDate = null;
      }
      const resumeId = this.experience.belongsTo('resume').id();
      await this.experience.save();
      const descs = await this.experience.descriptions;
      const list = descs?.toArray?.() ?? Array.from(descs ?? []);
      if (list.length) {
        await Promise.all(list.map((d) => d.save?.() ?? d));
      }
      this.router.transitionTo('resumes.show', resumeId, this.experience.id);
    } catch (e) {
      this.errorMessage = e?.message ?? 'Failed to save experience';
    }
  }

  @action cancel() {
    if (this.experience?.isNew) this.experience.rollbackAttributes();
    const resumeId =
      this.experience?.belongsTo('resume')?.id() ?? this.args.resume?.id;
    this.router.transitionTo('resumes.show.experience.index', resumeId);
  }

  @action updateEditingDraft(event) {
    this.editingDraft = event.target.value;
  }

  @action
  toggleExperience() {
    this.isExpanded = !this.isExpanded;
  }

  @action async commitDescription(index, desc) {
    desc.content = (this.editingDraft ?? '').trim();
    // No persistence here; defer saving until the whole resume is saved/cloned
    this.editingIndex = null;
    this.editingDraft = '';
  }

  @action addDescription() {
    const exp = this.experience ?? this.args.experience;
    if (!exp) return;

    const current = exp.descriptions;
    const nextOrder =
      (current?.toArray?.()?.length ??
        (Array.isArray(current) ? current.length : 0)) + 1;

    const desc = this.store.createRecord('description', {
      content: '',
      order: nextOrder,
      experience: exp,
    });

    current?.pushObject?.(desc);
  }

  @action async removeDescription(desc) {
    if (!desc) return;
    (this.experience ?? this.args.experience)?.descriptions?.removeObject?.(
      desc,
    );

    if (desc.isNew) {
      desc.unloadRecord?.();
    } else {
      await desc.destroyRecord?.();
    }
  }

  @action toggleCurrentlyWorking(event) {
    const checked = event.target.checked;
    this.currentlyWorking = checked;
    if (checked) {
      this.experience.endDate = null;
    }
  }
}
