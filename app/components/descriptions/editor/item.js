import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class DescriptionsEditorItem extends Component {
  @service store;

  @tracked isEditing = false;

  draft = false;

  get description() {
    return this.args.description;
  }

  @action deleteDesc() {
    this.description
      .destroyRecord()
      .then(this.experience.removeObject(this.description));
  }

  @action startEditDescription() {
    this.editingDraft = this.description.content ?? '';
    this.isEditing = true;
  }

  @action async commitDescription() {
    this.description.save().then(() => (this.isEditing = false));
  }

  @action onInput(event) {
    this.args.description.content = event.target.value;
  }

  // @action cancelEditDescription() {
  //     this.editingIndex = null;
  //     this.editingDraft = '';
  // }

  // @action updateEditingDraft(event) {
  //     this.editingDraft = event.target.value;
  // }
}
