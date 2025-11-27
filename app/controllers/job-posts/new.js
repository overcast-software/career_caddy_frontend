import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class JobPostsNewController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  get companies() {
    return this.store.findAll('company');
  }
  @action
  updateField(field, event) {
    this.model[field] = event.target.value;
  }

  @action submitDelete(){
    this.model.destroyRecord()
        .then(()=> this.flashMessages.success("successfully deleted record"))
  }

  @action addCompanyToJobPost(company) {
    this.model.company = company;
  }

  @action submitJobPost(event){
    event.preventDefault()
    this.model.save()
        .then(()=> this.flashMessages.success("Job post saved"))
        .then(()=> this.router.transitionTo('job-posts.show', this.model))
  }
}
