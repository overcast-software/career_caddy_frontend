import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class CoverLettersShowRoute extends Route {
  @service store;

  async model({ cover_letter_id }) {
      const coverLetter = await this.store.findRecord('cover-letter', cover_letter_id, {include: "job-post"});
      const jobPost = await this.store.peekAll('job-post', 1)[0]
      coverLetter.jobPost = jobPost
      return coverLetter
  }
}
