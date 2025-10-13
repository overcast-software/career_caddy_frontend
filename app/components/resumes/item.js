import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
export default class ResumesItemComponent extends Component {
    @service router;
    @service store;


    @action
    async submitResume() {
        const source = this.args.resume;
        await source.save()
    }
}
