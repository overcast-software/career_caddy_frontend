import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobApplicationsEdit extends Component {
  @service store;
  @service currentUser;
  @action updateNotes(event){
    this.args.jobApplication.notes = event.target.value
  }
  get user(){
    return this.currentUser.user
  }
  get jobApplication(){
    return this.args.jobApplication
  }
  @action updateCoverLetter(){}
  @action saveApplication(){}
  @action updateResume(){}
  @action updateField(field, event) {
    if (field === 'issueDate') {
      this.certification[field] = event.target.valueAsDate ?? null;
    } else {
      this.certification[field] = event.target.value;
    }
  }

  get jobPostAtCompany(){
    const jobPost = this.jobApplication.belongsTo('jobPost').value()
    return  `${jobPost.title} at ${jobPost.company.get('name')}`
  }
}
