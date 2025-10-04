import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ExperiencesFormComponent extends Component {
  @service router;
  @service store;
  @tracked errorMessage = null;
  @tracked dragIndex = null;

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

  @action updateField(field, event) {
    if (field === 'startDate' || field === 'endDate') {
      this.experience[field] = event.target.valueAsDate ?? null;
    } else if (field === 'content' && event?.target?.isContentEditable) {
      this.experience.content = event.target.innerHTML;
    } else {
      this.experience[field] = event.target.value;
    }
  }

  @action async splitIntoDescriptions() {
    const content = (this.experience.content || '').trim();
    if (!content) return;
    const descs = await this.experience.descriptions;
    if (descs.length > 0) return; // already split
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    lines.forEach((text, idx) => {
      this.store.createRecord('description', {
        content: text,
        order: idx,
        experience: this.experience,
      });
    });
  }

  @action dragStart(index, event) {
    this.dragIndex = index;
    event.dataTransfer.effectAllowed = 'move';
  }

  @action dragOver(_index, event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  @action async drop(index, event) {
    event.preventDefault();
    const descs = this.orderedDescriptions;
    if (this.dragIndex === null || this.dragIndex === index) return;
    const [moved] = descs.splice(this.dragIndex, 1);
    descs.splice(index, 0, moved);
    descs.forEach((d, i) => (d.order = i));
    const resumeId = this.experience?.belongsTo?.('resume')?.id?.();
    const standaloneAllowed = this.args?.allowStandaloneSave !== false && !!resumeId;
    if (standaloneAllowed) {
      await Promise.all(descs.map((d) => d.save?.() ?? d));
    }
    this.dragIndex = null;
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
}
