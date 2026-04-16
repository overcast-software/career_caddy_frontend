import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SummariesCarousel extends Component {
  @tracked _currentIndex = null;

  get summariesArray() {
    const summaries = this.args.summaries;
    if (!summaries) return [];
    return summaries.toArray ? summaries.toArray() : [...summaries];
  }

  get currentIndex() {
    if (this._currentIndex !== null) return this._currentIndex;
    const summaries = this.summariesArray;
    for (let i = 0; i < summaries.length; i++) {
      if (summaries[i]?.active) return i;
    }
    return 0;
  }

  get positionLabel() {
    const count = this.summariesArray.length;
    if (count === 0) return '';
    return `${this.currentIndex + 1} / ${count}`;
  }

  get currentSummary() {
    const summaries = this.summariesArray;
    if (!summaries.length) return null;
    return summaries[this.currentIndex] ?? summaries[0];
  }

  @action
  prev() {
    const count = this.summariesArray.length;
    if (count < 2) return;
    const newIndex = (this.currentIndex - 1 + count) % count;
    this._navigate(newIndex);
  }

  @action
  next() {
    const count = this.summariesArray.length;
    if (count < 2) return;
    const newIndex = (this.currentIndex + 1) % count;
    this._navigate(newIndex);
  }

  async _navigate(newIndex) {
    const resume = this.args.resume;
    const newSummary = this.summariesArray[newIndex];
    this._currentIndex = newIndex;
    if (resume && newSummary) {
      newSummary.active = true;
      newSummary.resume = resume;
      this.args.onChange?.(newSummary);
      await newSummary.save();
    }
  }
}
