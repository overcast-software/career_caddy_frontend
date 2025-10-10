import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
// import { jsonApiFromRecord } from '../../utils/jsonapi-from-record';
export default class ResumesItemComponent extends Component {
    @service router;
    @service store;


    @action
    async submitResume() {

        const exp = this.store.peekRecord('experience', 1)
        exp.title = 'funtimes'
        await exp.save()
        const source = this.args.resume
        const lol = source.serialize()
        // lol.data.type = 'resume'

        debugger
        source.save({ include: 'user,scores,cover-letters,applications,summaries,experiences,educations,certifications' }).then((response) => { console.log(response)})

        this.store.push(lol)
    }
}
