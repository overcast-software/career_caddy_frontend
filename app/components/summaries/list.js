import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import ArrayProxy from '@ember/array/proxy';

export default class SummariesList extends Component {
  @tracked lastDirection = '';

  get activeSummaryIndex() {
    return ArrayProxy.create({content: this.args.summaries.content}).indexOf(this.activeSummary)
  }

  get activeSummary() {
    const summary = ArrayProxy.create({content: this.args.summaries.content}).findBy('active');
    return summary
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
      content: this.args.summaries.content,
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
      content: this.args.summaries.content,
    });
    const oldSummary = summariesProxies.objectAt(currIndex);
    const newSummary = summariesProxies.objectAt(newIndex);
    oldSummary.active = false;
    newSummary.active = true;
    oldSummary.save().then(() => newSummary.save());
  }
}
