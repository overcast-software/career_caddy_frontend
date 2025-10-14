import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';


export default class DescriptionsEditorForm extends Component {

    @service store;

    constructor(owner, args) {
        super(owner, args);
        this.draft = this.description?.content ?? '';
    }

    get description(){
        return this.args.description
    }

    get experience(){
        return this.args.experience
    }

    // @action updateDesc(event) {
    //     this.description.content = event.target.value
    // }

    // @action deleteDesc() {
    //     this.description.destroyRecord()
    //         .then(this.experience.removeObject(this.description))
    // }


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
