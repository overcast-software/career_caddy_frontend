import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class JobApplicationsNewController extends Controller {
  @service store;
  @service flashMessages
  get jobPost(){
    this.store.peekRecord('job-post', this.jobId)
  }
  get coverLetters() {
    return this.store.peekAll('cover-letter');
  }

  @action clearMessages(){
    console.log("derp")
    this.flashMessages.clearMessages()
  }
  @action honk() {
    this.flashMessages.clearMessages()
    this.flashMessages.success('honk honk', {
      showProgress: true,
    });
  }
}
