import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class CoverLettersShowRoute extends Route {
  @service store;

  async model({ cover_letter_id }) {
    //this is a bug fix for something that should normally just work
    const coverLetter = await this.store.findRecord(
      'cover-letter',
      cover_letter_id,
      { reload: true, include: 'job-post,job-post.company,resume' },
    );
    await coverLetter.jobPost;
    // await coverLetter.resume
    return coverLetter;
  }
}
