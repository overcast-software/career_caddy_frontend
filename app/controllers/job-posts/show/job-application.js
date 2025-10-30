import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationController extends Controller {
    @service store;
    get data(){
        let data = {}
        const coverLetters = this.store.peekAll('cover-letter').filter(cl => cl.jobPost === this.model)
        data.coverLetters = coverLetters
        const application = this.store.createRecord('application')
        const resumes = this.store.peekAll("resume")
        data.jobPosts = this.model
        data.application = application
        data.resumes = resumes
        data.users = this.store.peekAll("user")

        return data
    }
}
