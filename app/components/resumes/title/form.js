import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ResumesTitleForm extends Component {
  @tracked _title;
  @tracked _name;
  @tracked _notes;

  get title() {
    return this._title ?? this.args.resume?.title;
  }

  get name() {
    return this._name ?? this.args.resume?.name;
  }

  get notes() {
    return this._notes ?? this.args.resume?.notes;
  }

  @action updateTitle(event) {
    this._title = event.target.value;
    this.args.resume.title = this._title;
  }

  @action updateName(event) {
    this._name = event.target.value;
    this.args.resume.name = this._name;
  }

  @action updateNotes(event) {
    this._notes = event.target.value;
    this.args.resume.notes = this._notes;
  }
}
