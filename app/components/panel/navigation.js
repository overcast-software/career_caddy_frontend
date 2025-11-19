import Component from '@glimmer/component';
import { action } from '@ember/object';
import ArrayProxy from '@ember/array/proxy';

export default class PanelNavigation extends Component {
  @action leftAction() {
    this.args.left();
  }
  @action rightAction() {
    this.args.right();
  }
  @action upAction() {
    this.args.up();
  }
  @action downAction() {
    this.args.down();
  }

  wrappedRecords = null;
  get records() {
    if (!this.wrappedRecords) {
      this.wrappedRecords = ArrayProxy.create({
        content: this.args.recordArray.content,
      });
    }
    return this.wrappedRecords;
  }

  @action
  async selectPrevious() {
    const length = this.records.length;
    const currIndex = this.activeRecordIndex;
    let newIndex = currIndex - 1;
    if (newIndex < 0) {
      newIndex = length - 1;
    }
    const oldRecord = this.records.objectAt(currIndex);
    const newRecord = this.records.objectAt(newIndex);
    oldRecord.active = false;
    newRecord.active = true;
    oldRecord.save().then(() => newRecord.save());
  }

  get activeRecordIndex() {
    return this.records.indexOf(this.activeRecord);
  }

  get activeRecord() {
    return this.records.findBy('active');
  }

  @action
  async selectNext() {
    const length = this.records.length;
    const currIndex = this.activeRecordIndex;
    const newIndex = (currIndex + 1) % length;
    const oldSummary = this.records.objectAt(currIndex);
    const newSummary = this.records.objectAt(newIndex);
    oldSummary.active = false;
    newSummary.active = true;
    oldSummary.save().then(() => newSummary.save());
  }
}
