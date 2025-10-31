import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import ArrayProxy from '@ember/array/proxy';

export default class SummariesList extends Component {
  @tracked lastDirection = '';

  get activeSummaryIndex() {
    return this.args.summaries.findIndex((sum) => sum.active);
  }

  get activeSummary() {
    return this.args.summaries.find((sum) => sum.active);
  }

  @action
  async selectPrevious() {
    const length = this.args.summaries.length;
    const currIndex = this.activeSummaryIndex;
    let newIndex = currIndex - 1;
    if (newIndex < 0) {
      newIndex = length - 1;
    }
    const summariesProxies = ArrayProxy.create({
      content: this.args.summaries,
    });
    const oldSummary = summariesProxies.objectAt(currIndex);
    const newSummary = summariesProxies.objectAt(newIndex);
    oldSummary.active = false;
    newSummary.active = true;
    oldSummary.save().then(() => newSummary.save());
  }

  @action
  selectNext() {
    const length = this.args.summaries.length;
    const currIndex = this.activeSummaryIndex;
    const newIndex = (currIndex + 1) % length;
    const summariesProxies = ArrayProxy.create({
      content: this.args.summaries,
    });
    const oldSummary = summariesProxies.objectAt(currIndex);
    const newSummary = summariesProxies.objectAt(newIndex);
    oldSummary.active = false;
    newSummary.active = true;
    oldSummary.save().then(() => newSummary.save());
  }
}
