import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import { tracked } from '@glimmer/tracking';
export default class JobApplicationsEdit extends Component {
  @service store;
  @service currentUser;
  @service flashMessages;
  @tracked selectedCompany = null;
  @tracked disableCompanySelector = false;
  constructor() {
    super(...arguments);

    const company = this.args.jobApplication.get('company')
    if (company) {
      this.selectedCompany = company;
      this.disableCompanySelector = true;
    }
  }

  get resumes(){
    return this.store.fineAll('resume')
  }

  get coverLetters(){
    return this.store.findAll('cover-letter')
  }

  @action updateNotes(event) {
    this.args.jobApplication.notes = event.target.value;
  }
  get user() {
    return this.currentUser.user;
  }
  get companies() {
    return this.store.findAll('company');
  }
  get jobApplication() {
    return this.args.jobApplication;
  }
  @action updateCoverLetter(event) {
    const id = event.target.value;
    if (id === '') {
      this.jobApplication.coverLetter = null;
      return;
    }

    let coverLetter = this.store.peekRecord('cover-letter', id);
    if (!coverLetter) {
      coverLetter = this.store.findRecord('cover-letter', id);
    }
    this.jobApplication.coverLetter = coverLetter;
  }

  @action async saveApplication() {
    this.jobApplication.save().then(() => this.flashMessages.success('saved'));
  }

  @action updateResume(event) {
    const id = event.target.value;
    if (id === '') {
      this.jobApplication.resume = null;
      return;
    }

    let resume = this.store.peekRecord('resume', id);
    if (!resume) {
      resume = this.store.findRecord('resume', id);
    }
    this.jobApplication.resume = resume;
  }

  @action updateField(field, event) {
    if (field === 'appliedAt') {
      this.jobApplication[field] = event.target.valueAsDate ?? null;
    } else {
      this.jobApplication[field] = event.target.value;
    }
  }

  get jobPostAtCompany() {
    const jobPost = this.jobApplication.jobPost;
    const company = jobPost.company;
    if (!jobPost) return '';
    if (!company) return jobPost.title;
    return `${jobPost.title} at ${company.name}`;
  }

  get coverLetterOptions() {
    const coverLetters = this.user?.coverLetters;
    let coverLetterArray = [];

    if (coverLetters?.toArray) {
      coverLetterArray = coverLetters.toArray();
    } else if (Array.isArray(coverLetters)) {
      coverLetterArray = coverLetters;
    }

    return coverLetterArray.filter(
      (cl) => cl.id !== this.jobApplication?.coverLetter?.id,
    );
  }

  get statusOptions() {
    const fun = this.statuses.filter((s) => s != this.jobApplication.status);
    return fun;
  }
  get selectedCoverLetterId() {
    return this.args.jobApplication?.belongsTo('coverLetter')?.id() ?? '';
  }

  get statuses() {
    return ['Applied', 'Interviewing', 'Rejected', 'Offer', 'Withdrawn'];
  }

  get baseId() {
    return `job-applications-edit-${guidFor(this)}`;
  }

  get jobPostInputId() {
    return `${this.baseId}-job-post`;
  }

  get resumeSelectId() {
    return `${this.baseId}-resume`;
  }

  get coverLetterSelectId() {
    return `${this.baseId}-cover-letter`;
  }

  get appliedAtInputId() {
    return `${this.baseId}-applied-at`;
  }

  get statusSelectId() {
    return `${this.baseId}-status`;
  }

  get trackingUrlInputId() {
    return `${this.baseId}-tracking-url`;
  }

  get notesTextareaId() {
    return `${this.baseId}-notes`;
  }
}
