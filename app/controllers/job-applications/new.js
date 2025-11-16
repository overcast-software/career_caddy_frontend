import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class JobApplicationsNewController extends Controller {
  @service store;
  @service flashMessages
  get jobPosts() {
    return this.store.peekAll('job-post');
  }
  get resumes() {
    return this.store.peekAll('resume');
  }
  get coverLetters() {
    return this.store.peekAll('cover-letter');
  }

  @action honk(){ this.flashMessages.success("honk")}
}
