import Component from '@glimmer/component';
import { service } from '@ember/service'; 
export default class ResumesItemComponent extends Component {
    @service router;
    @service store;

    get canClone() {
        return this.router.currentRouteName === 'resumes.show';
    }
}
