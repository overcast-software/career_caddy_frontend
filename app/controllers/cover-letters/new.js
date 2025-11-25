import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CoverLettersNewController extends Controller {
  @service store;
  @service flashMessages;
  @action saveCoverLetter(){
    this.model.save()
        .then(()=> this.flashMessages.success('saved'))
  }
  get companies() {
    // XXX got rid of this
    return this.store.peekAll('company');
  }

  get jobPosts(){
    return this.store.peekAll('job-post');
  }

  @action updateCoverLetter(event){
    this.model.content = event.target.value;
  }

  @action addJobPostToCoverLetter(jobPost){
    this.model.jobPost = jobPost
  }
}
