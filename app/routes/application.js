import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service store;

  model() {
      // const application = this.store.createRecord('application', { appliedAt: new Date(), status: 'applied' });
      // const usersPromise = this.store.findAll('user');
      // const jobPostsPromise = this.store.findAll('job-post');
      // const resumesPromise = this.store.findAll('resume');
      // const coverLetterPromise = this.store.findAll('cover-letter');
      // const scorePromise = this.store.findAll('score');
      // const companyPromise = this.store.findAll('company');

      // return Promise.all([
      //     usersPromise,
      //     jobPostsPromise,
      //     resumesPromise,
      //     coverLetterPromise,
      //     scorePromise,
      //     companyPromise
      // ]).then(
      //   ([users, jobPosts, resumes, coverLetters, scores, companies]) => ({
      //     application,
      //     users,
      //     jobPosts,
      //     resumes,
      //     coverLetters,
      //     scores,
      //     companies
      //   })
      // );

    return this.store.findRecord('user', 1);
  }
}
