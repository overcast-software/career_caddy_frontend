import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class JobApplicationsNewController extends Controller {
  @service store;
  @service flashMessages;
  @tracked selectedJobPost;
  @tracked selectedReusme
  constuctor(){
    this.selectedJobPost = this.model.jobPost
    this.selectedResume = this.model.resume
  }
  get coverLetters() {
    return this.store.peekAll('cover-letter');
  }

  get resumes(){
    return this.store.peekAll('resume')
  }
  get jobPosts(){
    return this.store.peekAll('job-post')
  }
  @action clearMessages() {
    this.flashMessages.clearMessages();
  }

  @action honk() {
    this.flashMessages.success('honk honk', {
      showProgress: true,
      sticky: true,
    });
  }

  get jobApplication() {
    return this.args.jobApplication;
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


  get cantSave() {
    return !this.canSave;
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

    this.args.jobApplication
      .save()
      .then((app) => {
        this.flashMessages.success('job application saved');
        return app;
      })
      .then((app) => this.router.transitionTo('job-applications.show', app));
  }

  @action updateStatus(event) {
    const status = event?.target?.value ?? '';
    this.jobApplication.status = status;
    this.toggleAppliedAt();
  }

  @action updateCoverLetter(event) {
    const id = event?.target?.value ?? '';
    const selected = this.args.coverLetters.find((cl) => cl.id === id);
    this.selectedCoverLetter = selected;
  }

  @action updateResume(event) {
    const id = event?.target?.value ?? '';
    const selected = this.args.resumes.find((r) => r.id === id);
    this.selectedResume = selected;
  }

  @action updateJobPost(event) {
    const id = event?.target?.value ?? '';
    const selected = this.args.jobPosts.find((jp) => jp.id === id);
    this.selectedJobPost = selected;

    // Clear error message if a valid job post is selected
    if (selected && selected.id) {
      this.errorMessage = null;
    }

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
