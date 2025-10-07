import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ExperiencesFormComponent extends Component {
  @service router;
  @service store;
  @tracked errorMessage = null;
  @tracked editingIndex = null;
  @tracked editingDraft = '';

  constructor(...args) {
    super(...args);
    if (this.experience?.id) {
      this.experience.hasMany?.('descriptions')?.load?.();
    }
  }

  get experience() {
    return this.args.experience ?? this.args.model;
  }

  get resumeId() {
    return this.experience?.belongsTo?.('resume')?.id?.() ?? this.args.resume?.id ?? '';
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

  isEditing = (index) => this.editingIndex === index;

  @action updateField(field, event) {
    if (field === 'startDate' || field === 'endDate') {
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
      const standaloneAllowed = this.args?.allowStandaloneSave !== false && !!resumeId;
      const resume = this.experience?.belongsTo?.('resume')?.value?.();

      if (this.experience.isNew || !standaloneAllowed) {
        // Remove locally and let Save Resume handle persistence (if any)
        this.experience.deleteRecord();
        const rel = await resume?.experiences;
        rel?.removeObject?.(this.experience);
        return;
      }

      await this.experience.destroyRecord();
      this.router.transitionTo('resumes.show.experience.index', resumeId);
    } catch (e) {
      this.errorMessage = e?.message ?? 'Failed to delete experience';
    }
  }

  @action async save(event) {
    event?.preventDefault();
    try {
      const resumeId = this.experience.belongsTo('resume').id();
      const standaloneAllowed = this.args?.allowStandaloneSave !== false && !!resumeId;
      if (standaloneAllowed) {
        await this.experience.save();
        const descs = await this.experience.descriptions;
        const list = descs?.toArray?.() ?? Array.from(descs ?? []);
        if (list.length) {
          await Promise.all(list.map(d => d.save?.() ?? d));
        }
        this.router.transitionTo('resumes.show.experience.show', resumeId, this.experience.id);
      } else {
        // On New page we defer saving until "Save Resume"
        return;
      }
    } catch (e) {
      this.errorMessage = e?.message ?? 'Failed to save experience';
    }
  }

  @action cancel() {
    if (this.experience?.isNew) this.experience.rollbackAttributes();
    const resumeId = this.experience?.belongsTo('resume')?.id() ?? this.args.resume?.id;
    this.router.transitionTo('resumes.show.experience.index', resumeId);
  }

  @action startEditDescription(index, desc) {
    this.editingIndex = index;
    this.editingDraft = desc?.content ?? '';
  }

  @action updateEditingDraft(event) {
    this.editingDraft = event.target.value;
  }

  @action async commitDescription(index, desc) {
    desc.content = (this.editingDraft ?? '').trim();
    // No persistence here; defer saving until the whole resume is saved/cloned
    this.editingIndex = null;
    this.editingDraft = '';
  }

  @action cancelEditDescription() {
    this.editingIndex = null;
    this.editingDraft = '';
  }

  @action async handleDescriptionKeydown(index, desc, event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await this.commitDescription(index, desc);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditDescription();
    }
  }
}
