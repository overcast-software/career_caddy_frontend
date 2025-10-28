import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowController extends Controller {

    @service store;
    @tracked data = null;
    @tracked loading = true;
    @tracked error = null;
    @tracked application = null;
    @tracked resumes = null;
    @tracked users = null;
    @tracked coverLetters = null;

    showControls = true;
    constructor() {
        super(...arguments);
        this.loadData();
    }

    async loadData() {
        try {
            this.loading = true;
            this.error = null;

            const jobPost = this.model;

            const [resumes, users, coverLetters] = await Promise.all([
                this.store.findAll('resume'),
                this.store.findAll('user'),
                this.store.findAll('cover-letter')
            ]);

            this.application = this.store.createRecord('application', {
                jobPost,
                status: 'applied'
            });
            this.resumes = resumes;
            this.users = users;
            this.coverLetters = coverLetters;

            this.data = { jobPost, coverLetters, application: this.application, resumes, users };
        } catch (err) {
            this.error = err;
        } finally {
            this.loading = false;
        }
    }
}
