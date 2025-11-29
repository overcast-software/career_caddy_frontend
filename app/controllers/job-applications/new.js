import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class JobApplicationsNewController extends Controller {
  @service store;
  @service router;
  @service flashMessages;
  @tracked selectedJobPost;
  @tracked selectedResume;
  @tracked selectedStatus;
  @tracked selectedCoverLetter;

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
    const app = this.model;
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
    this.showAppliedAt = this.model.status === 'Applied';
  }

  @action saveApplication() {
    if (!this.selectedJobPost) {
      this.flashMessages.warn('please select a job.');
      return;
    }
    this.model.jobPost = this.selectedJobPost
      ? this.store.peekRecord('job-post', this.selectedJobPost?.id)
      : undefined;
    this.model.resume = this.selectedResume
      ? this.store.peekRecord('resume', this.selectedResume?.id)
      : undefined;
    this.model.coverLetter = this.selectedCoverLetter
      ? this.store.peekRecord('cover-letter', this.selectedCoverLetter.id)
      : undefined;

    this.model
      .save()
      .then((app) => {
        this.flashMessages.success('job application saved');
        return app;
      })
      .then((app) => this.router.transitionTo('job-applications.show', app))
      .catch((error) => this.flashMessages.alert(error));
  }

  @action updateStatus(status) {
    this.selectedStatus = status;
    this.model.status = status;
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
  }
}
