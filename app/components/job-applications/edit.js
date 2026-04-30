import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import { tracked } from '@glimmer/tracking';
import {
  stepsForStatus,
  TERMINAL_STATES,
} from 'career-caddy-frontend/utils/job-application-steps';
export default class JobApplicationsEdit extends Component {
  @service store;
  @service currentUser;
  @service flashMessages;
  @tracked selectedCompany = null;
  @tracked disableCompanySelector = false;

  get resumes() {
    return this.store.peekAll('resume');
  }

  get coverLetters() {
    return this.store.peekAll('cover-letter');
  }

  @action updateNotes(event) {
    this.jobApplication.set('notes', event.target.value);
  }

  get user() {
    return this.currentUser.user;
  }
  get companies() {
    return this.store.findAll('company');
  }

  get statusSteps() {
    return stepsForStatus(this.args.jobApplication?.status);
  }

  failedStates = TERMINAL_STATES;

  get jobApplication() {
    return this.args.jobApplication;
  }

  @action updateCoverLetter(coverLetter) {
    this.jobApplication.coverLetter = coverLetter;
  }

  @action async saveApplication(event) {
    event?.preventDefault();
    if (this.args.save) {
      this.args.save();
      return;
    }
    try {
      await this.jobApplication.save();
      this.flashMessages.success('Application saved.');
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save application.');
      }
    }
  }

  @action updateResume(resume) {
    this.jobApplication.resume = resume;
  }

  @action updateJobPost(jobPost) {
    this.jobApplication.jobPost = jobPost;
  }

  @action updateField(field, event) {
    if (field === 'appliedAt') {
      this.jobApplication[field] = event.target.valueAsDate ?? null;
    } else {
      this.jobApplication[field] = event.target.value;
    }
  }

  get jobPostAtCompany() {
    // this is because I wasn't using await
    // or because company wasn't reported as a relationship to job-post
    const jobPost = this.jobApplication.jobPost;
    const company = jobPost.company;
    if (!jobPost) return '';
    if (!company) return jobPost.title;
    return `${jobPost.title} at ${company.name}`;
  }

  get coverLetterOptions() {
    // this should get refactored out
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
    return [
      'Unvetted',
      'Vetted Good',
      'Applied',
      'Contact',
      'Interview Scheduled',
      'Interviewed',
      'Technical Test',
      'Awaiting Decision',
      'Offer',
      'Accepted',
      'Declined',
      'Vetted Bad',
      'Rejected',
      'Expired',
      'Archived',
    ];
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
