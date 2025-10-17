import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
export default class ResumesItemComponent extends Component {
    @service router;
    @service store;

    get canClone() {
        return this.router.currentRouteName === 'resumes.show';
    }
}
