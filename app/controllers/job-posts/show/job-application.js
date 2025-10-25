import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationController extends Controller {
    @service store;
    get data(){
        let data = {}
        debugger
        console.log(this.router.model)
        const coverLetters = this.store.peekAll('cover-letter', {jobPost: this.model})
        data.model.coverLetters = coverLetters
        const application = this.createRecord('application')
        const resumes = this.findAll("resume")
        data.jobPosts = this.model
        data.application = application
        data.resumes = resumes
        data.users = this.findAll("user")

        return data
    }
}
