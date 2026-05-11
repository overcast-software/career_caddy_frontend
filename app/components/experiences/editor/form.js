import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { toCalendarString } from 'career-caddy-frontend/utils/tz';
import move from 'ember-animated/motions/move';
import opacity from 'ember-animated/motions/opacity';
import { easeOut } from 'ember-animated/easings/cosine';

export default class ExperiencesEditorForm extends Component {
  @service store;
  @service flashMessages;

  @tracked errorMessage = null;
  @tracked isExpanded = false;
  @tracked currentlyWorking = false;
  @tracked _pendingCompany = null;
  @tracked _localDescOrder = null;

  constructor() {
    super(...arguments);
    this.currentlyWorking = !this.args.experience?.endDate;
    if (this.args.experience?.isNew) {
      this.isExpanded = true;
    }
  }

  get currentCompany() {
    if (this._pendingCompany) return this._pendingCompany;
    return this.args.experience?.belongsTo?.('company')?.value?.() ?? null;
  }

  get descriptions() {
    if (this._localDescOrder) return this._localDescOrder;
    const descs = this.args.experience?.hasMany?.('descriptions')?.value?.();
    if (!descs) return [];
    const arr = [];
    for (const d of descs) arr.push(d);
    return arr;
  }

  get lastDescriptionIndex() {
    return this.descriptions.length - 1;
  }

  *reorderTransition({ keptSprites }) {
    yield Promise.all(
      keptSprites.map((sprite) => move(sprite, { easing: easeOut })),
    );
  }

  *expandTransition({ insertedSprites, removedSprites }) {
    yield Promise.all([
      ...insertedSprites.map((s) =>
        opacity(s, { from: 0, to: 1, duration: 180 }),
      ),
      ...removedSprites.map((s) => opacity(s, { to: 0, duration: 120 })),
    ]);
  }

  @action setCompany(company) {
    this._pendingCompany = company;
    this.args.experience.company = company;
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

    // New experiences must hit the server first so the description can link
    // to a real experience.id.
    const ensureSaved = exp.isNew ? exp.save() : Promise.resolve();
    ensureSaved
      .then(() => exp.descriptions)
      .then((descs) => {
        const desc = this.store.createRecord('description', {
          content: '',
          order: descs.length,
          experience: exp,
        });
        descs.push(desc);
      })
      .catch((e) => {
        this.errorMessage = e?.message ?? 'Failed to add description';
      });
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

  @action moveDescUp(index) {
    if (index <= 0) return;
    this._swapDescriptions(index, index - 1);
  }

  @action moveDescDown(index) {
    if (index >= this.descriptions.length - 1) return;
    this._swapDescriptions(index, index + 1);
  }

  _swapDescriptions(a, b) {
    const list = [...this.descriptions];
    [list[a], list[b]] = [list[b], list[a]];
    this._localDescOrder = list;
    this._persistDescriptionOrder(list);
  }

  _persistDescriptionOrder(list) {
    const exp = this.args.experience;
    if (!exp || exp.isNew) return;
    const ids = list
      .filter((d) => !d.isNew)
      .map((d) => Number(d.id))
      .filter(Number.isFinite);
    if (ids.length === 0) return;
    exp.reorderDescriptions(ids).catch((e) => {
      this.errorMessage = e?.message ?? 'Reorder failed';
    });
  }
}
