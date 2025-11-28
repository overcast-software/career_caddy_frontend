import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class JobApplicationsNewController extends Controller {
  @service store;
  @service flashMessages;
  @tracked selectedJobPost;
  @tracked selectedReusme;
  @tracked selectedStatus;
  @tracked selectedCoverLetter;
  constructor() {
    super(...arguments);
  }

  get jobApplication() {
    return this.args.jobApplication;
  }

  get coverLetters() {
    const coverLetters = this.store.peekAll('cover-letter');
    console.log(coverLetters);
    if (this.selectedJobPost) {
      return coverLetters.filter(
        (cl) => cl.jobPost.id === this.selectedJobPost.id,
      );
    } else {
      return coverLetters;
    }
  }

  get resumes() {
    return this.store.peekAll('resume');
  }

  get jobPosts() {
    return this.store.peekAll('job-post');
  }

  @action honk() {
    this.flashMessages.success('honk honk', {
      showProgress: true,
      sticky: true,
    });
  }

  get statuses() {
    return [
      'Saved',
      'Applied',
      'Researching',
      'Drafting Application',
      'Awaiting Response',
      'Phone Screen',
      'Interview Scheduled',
      'Interview Completed',
      'Negotiating',
      'Offer Accepted',
      'Offer Declined',
      'Application Withdrawn',
      'Archived',
    ];
  }

  @action updateField(field, event) {
    const app = this.jobApplication;
    if (field === 'appliedAt') {
      app.appliedAt = event.target.valueAsDate ?? null;
    } else {
      app[field] = event.target.value;
    }
  }

  get statusOptions() {
    return this.statuses;
  }

  get invalid() {
    // TODO always comes true.  validation can go here
    return false;
  }

  toggleAppliedAt() {
    this.showAppliedAt = this.jobApplication.status === 'Applied';
  }

  @action async saveApplication() {
    if (!this.selectedJobPost) {
      this.flashMessages.warn('please select a job.');
      return;
    }
    this.jobApplication.jobPost = this.selectedJobPost;
    this.jobApplication.resume = this.selectedResume;
    this.jobApplication.coverLetter = this.selectedCoverLetter;

    this.jobApplication
      .save()
      .then((app) => {
        this.flashMessages.success('job application saved');
        return app;
      })
      .then((app) => this.router.transitionTo('job-applications.show', app));
  }

  @action updateStatus(status) {
    this.selectedStatus = status
    this.jobApplication.status = status;
    this.toggleAppliedAt();
  }

  @action updateCoverLetter(coverLetter) {
    this.selectedCoverLetter = coverLetter;
  }

  @action updateResume(resume) {
    this.selectedResume = resume;
  }

  @action updateJobPost(jobPost) {
    this.selectedJobPost = jobPost;
    // If a cover letter is selected and it belongs to a different job post, clear it.
    const currentCL = this.jobApplication.coverLetter;
    if (
      currentCL &&
      selected &&
      currentCL.jobPost &&
      String(currentCL.jobPost.id) !== String(selected.id)
    ) {
      this.args.jobApplication.coverLetter = null;
    }
  }
}
