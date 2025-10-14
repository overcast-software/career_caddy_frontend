import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
export default class ResumesItemComponent extends Component {
    @service router;
    @service store;

    get canClone() {
        return this.router.currentRouteName === 'resumes.show';
    }


    @action
    async cloneResume() {
        const source = this.args.resume;
        await source.save();
        this.router.transitionTo('resumes.show', source.id);
    }
}
