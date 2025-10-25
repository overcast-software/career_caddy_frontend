import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationNewRoute extends Route {
    @service store;
    async model(){

        const { job_post_id } = this.paramsFor('job-posts.show');
        const applicationPromise = this.store.createRecord('application', { appliedAt: new Date(), status: 'applied' });
        const usersPromise = this.store.findAll('user');
        const jobPostPromise = this.store.findRecord('job-post', job_post_id);
        const resumesPromise = this.store.findAll('resume');
        const coverLetterPromise = this.store.findAll('cover-letter');
        const companyPromise = this.store.findAll("company")

        return Promise.all([applicationPromise, usersPromise, jobPostPromise, resumesPromise, coverLetterPromise, companyPromise]).then(
            ([application, users, jobPost, resumes, coverLetters, companies]) => ({
                application,
                users,
                jobPost,
                resumes,
                coverLetters,
                companies
            })
        );
    }
}
