import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class JobApplicationsNew extends Component {
  get statuses() {
    return ['Applied', 'Interviewing', 'Rejected', 'Offer', 'Withdrawn'];
  }

  @action updateField(field, event) {
    if (field === 'appliedAt') {
      this.jobApplication[field] = event.target.valueAsDate ?? null;
    } else {
      this.jobApplication[field] = event.target.value;
    }
  }

  get statusOptions() {
    const fun = this.statuses.filter(
      (s) => s != this.args.jobApplication.status,
    );
    return fun;
  }

  @action async saveApplication() {
    this.args.jobApplication.save();
  }
  @action updateCoverLetter(){
    // TODO update application.coverLetter
  }
  @action updateResume(){
    // TODO update application.resume
  }
  @action updateJobPost(){
    // TODO filter cover letters to the select job post
    // TODO update application.jobPost
  }
}
