import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class DescriptionsEditorForm extends Component {
  @service store;

  constructor(owner, args) {
    super(owner, args);
    this.draft = this.description?.content ?? '';
  }

  get description() {
    return this.args.description;
  }

  get experience() {
    return this.args.experience;
  }

  @action async commitDescription() {
    await this.description.save?.();
  }

  @action onInput(e) {
    this.description.content = e?.target?.value ?? '';
  }

  @action handleDescriptionKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      this.commitDescription();
    }
  }

  @action delete() {
    if (this.args?.onDelete) {
      this.args.onDelete(this.description);
      return;
    }
    if (this.description?.isNew) {
      this.description.deleteRecord?.();
    } else {
      this.description.destroyRecord?.();
    }
  }
}
