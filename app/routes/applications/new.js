import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApplicationsNewRoute extends Route {
  @service store;

  model() {
      const application = this.store.createRecord('application', { appliedAt: new Date(), status: 'applied' });
      const usersPromise = this.store.findAll('user');
      const jobPostsPromise = this.store.findAll('job-post');
      const resumesPromise = this.store.findAll('resume');
      const coverLetterPromise = this.store.findAll('cover-letter');

      return Promise.all([usersPromise, jobPostsPromise, resumesPromise, coverLetterPromise]).then(
        ([users, jobPosts, resumes, coverLetters]) => ({
          application,
          users,
          jobPosts,
          resumes,
          coverLetters
        })
      );
  }
}
