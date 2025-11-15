import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CoverLettersIndexRoute extends Route {
  @service store;

  async model() {
    const coverLetters = await this.store.findAll('cover-letter', {
      include: 'job-post,resume',
      reload: true,
    });
    const jobPosts = await this.store.findAll('job-post', {
      include: 'cover-letter',
    });
    return { coverLetters, jobPosts };
  }
}
