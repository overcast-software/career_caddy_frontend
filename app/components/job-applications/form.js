import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApplicationsForm extends Component {
  @service store;
    @service session;
  @service currentUser;

  get statuses() {
    return ['applied', 'in-review', 'interview', 'offer', 'rejected', 'withdrawn'];
  }

  @action
  updateField(field, event) {
    if (field === 'appliedAt') {
      if (event.target.valueAsDate) {
          this.args.data.application.appliedAt = event.target.valueAsDate;
      } else if (event.target.value) {
        // Parse YYYY-MM-DD and create local date
        const [year, month, day] = event.target.value.split('-').map(Number);
          this.args.data.application.appliedAt = new Date(year, month - 1, day);
      } else {
          this.args.data.application.appliedAt = null;
      }
    } else {
        this.args.data.application[field] = event.target.value;
    }
  }

  @action updateResume(event){
    let resume = this.store.peekRecord('resume', event.target.value)
    this.args.application.resume = resume
  }
  @action updateCoverLetter(event){
    let coverLetter = this.store.peekRecord('cover-letter', event.target.value)
    this.args.application.coverLetter = coverLetter
  }
  @action
  async updateRelation(field, event) {
    const fieldToType = {
      user: 'user',
      jobPost: 'job-post',
      resume: 'resume',
      coverLetter: 'cover-letter'
    };

    const type = fieldToType[field];
    const id = event.target.value;

    if (id === '') {
        this.args.data.application[field] = null;
      return;
    }

    let record = this.store.peekRecord(type, id);
    if (!record) {
      record = await this.store.findRecord(type, id);
    }
      this.args.data.application[field] = record;
  }

  @action
    saveApplication(){
        this.args.data.application.trackingUrl = this.args.data.jobPost.link
        this.args.data.application.jobPost = this.args.data.jobPost
        this.args.data.application.save()
    }
}
