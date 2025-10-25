import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowController extends Controller {

    @service store;
    @tracked data = null;
    @tracked loading = true;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.loadData();
    }

    get derp() { return 'derp controller' }
    async loadData() {
        try {
            this.loading = true;
            this.error = null;

            const jobPost = this.model;
            const application = this.store.createRecord('application');

            const [resumes, users, coverLetters] = await Promise.all([
                this.store.findAll('resume'),
                this.store.findAll('user'),
                this.store.findAll('cover-letter')
            ]);

            this.data = { jobPost, coverLetters, application, resumes, users };
        } catch (err) {
            this.error = err;
        } finally {
            this.loading = false;
        }
    }
}
