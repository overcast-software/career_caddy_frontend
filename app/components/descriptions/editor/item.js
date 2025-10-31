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
  // get experience(){
  //     return this.args.experience
  // }

  // @action updateDesc(event) {
  //     this.description.content = event.target.value
  // }

  // @action deleteDesc() {
  //     this.description.destroyRecord()
  //         .then(this.experience.removeObject(this.description))
  // }

  @action startEditDescription() {
    this.editingDraft = this.description.content ?? '';
    this.isEditing = true;
  }

  // @action cancelEditDescription() {
  //     this.editingIndex = null;
  //     this.editingDraft = '';
  // }

  // @action async handleDescriptionKeydown(index, desc, event) {
  //     if (event.key === 'Enter' && !event.shiftKey) {
  //     event.preventDefault();
  //     await this.commitDescription(index, desc);
  //     } else if (event.key === 'Escape') {
  //     event.preventDefault();
  //     this.cancelEditDescription();
  //     }
  // }

  @action async commitDescription() {
    this.description.save().then(() => (this.isEditing = false));
  }

  // @action async handleDescriptionKeydown(index, desc, event) {
  //     if (event.key === 'Enter' && !event.shiftKey) {
  //     event.preventDefault();
  //     await this.commitDescription(index, desc);
  //     } else if (event.key === 'Escape') {
  //     event.preventDefault();
  //     this.cancelEditDescription();
  //     }
  // }

  // @action onInput(){
  //     debugger
  // }

  // @action cancelEditDescription() {
  //     this.editingIndex = null;
  //     this.editingDraft = '';
  // }

  // @action updateEditingDraft(event) {
  //     this.editingDraft = event.target.value;
  // }
}
