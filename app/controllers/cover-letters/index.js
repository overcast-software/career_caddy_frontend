import Controller from '@ember/controller';

export default class CoverLettersIndexController extends Controller {
  get coverLetters() {
    return this.model.coverLetters;
  }
  get jobPosts() {
    return this.model.jobPosts;
  }
}
