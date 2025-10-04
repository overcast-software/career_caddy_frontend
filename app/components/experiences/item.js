import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ExperiencesItemComponent extends Component {
  @service router;

  get experience() {
    return this.args.experience ?? this.args.model;
  }

  get companyName() {
    const c = this.experience?.company;
    return c?.displayName || c?.name || '';
  }

  get dateRange() {
    const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 7) : null);
    const start = fmt(this.experience?.startDate);
    const end = fmt(this.experience?.endDate) || 'Present';
    return [start, end].filter(Boolean).join(' - ');
  }

  get orderedDescriptions() {
    const rel = this.experience?.descriptions;
    if (!rel || typeof rel.toArray !== 'function') return [];
    return rel.toArray().slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  @action edit() {
    const exp = this.experience;
    const resumeId = exp.belongsTo('resume').id();
    this.router.transitionTo('resumes.show.experience.edit', resumeId, exp.id);
  }

  @action async delete() {
    const exp = this.experience;
    const resumeId = exp.belongsTo('resume').id();
    await exp.destroyRecord();
    this.router.transitionTo('resumes.show.experience.index', resumeId);
  }
}
