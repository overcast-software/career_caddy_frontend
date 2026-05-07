import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

// Canonical profession values the audience-aware extraction prompt knows
// hints for. Free-form strings still work on the API side, but the UI
// surfaces these as the obvious picks.
export const PROFESSION_OPTIONS = [
  'Software Engineering',
  'Product Management',
  'Data / BI',
  'PR / Communications',
  'Marketing',
  'Sales',
  'Operations',
  'Design',
  'Finance',
  'Other',
];

export default class ResumesTitleForm extends Component {
  @tracked _title;
  @tracked _name;
  @tracked _notes;
  @tracked _profession;

  professionOptions = PROFESSION_OPTIONS;

  get title() {
    return this._title ?? this.args.resume?.title;
  }

  get name() {
    return this._name ?? this.args.resume?.name;
  }

  get notes() {
    return this._notes ?? this.args.resume?.notes;
  }

  get profession() {
    return this._profession ?? this.args.resume?.profession ?? '';
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

  @action updateProfession(event) {
    // Empty string from the placeholder option clears the field —
    // persist it as null so the API doesn't get an empty-string write.
    this._profession = event.target.value || null;
    this.args.resume.profession = this._profession;
  }
}
