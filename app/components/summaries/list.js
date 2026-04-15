import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SummariesList extends Component {
  @tracked _currentIndex = null;

  _at(summaries, idx) {
    if (typeof summaries.objectAt === 'function')
      return summaries.objectAt(idx);
    return summaries[idx];
  }

  get currentIndex() {
    if (this._currentIndex !== null) return this._currentIndex;
    const summaries = this.args.summaries;
    if (!summaries?.length) return 0;
    for (let i = 0; i < summaries.length; i++) {
      if (this._at(summaries, i)?.active) return i;
    }
    return 0;
  }

  get positionLabel() {
    const count = this.args.summaries?.length ?? 0;
    if (count === 0) return '';
    return `${this.currentIndex + 1} / ${count}`;
  }

  get currentSummary() {
    const summaries = this.args.summaries;
    if (!summaries?.length) return null;
    return this._at(summaries, this.currentIndex) ?? this._at(summaries, 0);
  }

  @action
  prev() {
    const summaries = this.args.summaries;
    const count = summaries?.length ?? 0;
    if (count < 2) return;
    const newIndex = (this.currentIndex - 1 + count) % count;
    this._navigate(newIndex);
  }

  @action
  next() {
    const summaries = this.args.summaries;
    const count = summaries?.length ?? 0;
    if (count < 2) return;
    const newIndex = (this.currentIndex + 1) % count;
    this._navigate(newIndex);
  }

  async _navigate(newIndex) {
    const resume = this.args.resume;
    const newSummary = this._at(this.args.summaries, newIndex);
    this._currentIndex = newIndex;
    if (resume && newSummary) {
      newSummary.active = true;
      newSummary.resume = resume;
      await newSummary.save();
    }
  }
}
