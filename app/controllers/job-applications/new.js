import Controller from '@ember/controller';
import { service } from '@ember/service';
export default class JobApplicationsNewController extends Controller {
  @service store;
  get jobPosts() {
    return this.store.peekAll('job-post');
  }
  get resumes() {
    return this.store.peekAll('resume');
  }
  get coverLetters() {
    return this.store.peekAll('cover-letter');
  }
}
