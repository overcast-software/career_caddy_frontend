import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
export default class JobApplicationsNew extends Component {
  @tracked showAppliedAt = false;
  @tracked errorMessage = null;
  @service flashMessages;

  constructor() {
    super(...arguments);
    const app = this.args.jobApplication;

    // Default Job Post: if none selected and exactly one option available, select it
    if (
      !app.jobPost &&
      Array.isArray(this.args.jobPosts) &&
      this.args.jobPosts.length === 1
    ) {
      app.jobPost = this.args.jobPosts[0];
    }

    // Default Resume: if none selected and options available, select first
    if (
      !app.resume &&
      Array.isArray(this.args.resumes) &&
      this.args.resumes.length > 0
    ) {
      app.resume = this.args.resumes[0];
    }

    // Default Cover Letter: if none selected and options available, select first
    if (
      !app.coverLetter &&
      Array.isArray(this.args.coverLetters) &&
      this.args.coverLetters.length > 0
    ) {
      app.coverLetter = this.args.coverLetters[0];
    }

    // Initialize applied-at visibility based on initial status
    this.toggleAppliedAt();
  }

  @action honk() {
    this.flashMessages.success('honk');
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

  get canSave() {
    return Boolean(this.jobApplication?.jobPost?.id);
  }

  get cantSave(){
    return !this.canSave
  }

  toggleAppliedAt() {
    this.showAppliedAt = this.jobApplication.status === 'Applied';
  }

  @action async saveApplication() {
    if (!this.jobApplication?.jobPost || !this.jobApplication.jobPost.id) {
      this.errorMessage = 'Please select a job post before saving.';
      return;
    }

    this.errorMessage = null;
    await this.args.jobApplication.save();
  }

  @action updateStatus(event) {
    const status = event?.target?.value ?? '';
    this.jobApplication.status = status;
    this.toggleAppliedAt();
  }

  @action updateCoverLetter(event) {
    const id = event?.target?.value ?? '';
    const selected =
      (this.args.coverLetters ?? []).find(
        (cl) => String(cl.id) === String(id),
      ) || null;
    this.args.jobApplication.coverLetter = selected;
  }

  @action updateResume(event) {
    const id = event?.target?.value ?? '';
    const selected =
      (this.args.resumes ?? []).find((r) => String(r.id) === String(id)) ||
      null;
    this.args.jobApplication.resume = selected;
  }

  @action updateJobPost(event) {
    const id = event?.target?.value ?? '';
    const selected =
      (this.args.jobPosts ?? []).find((jp) => String(jp.id) === String(id)) ||
      null;

    this.args.jobApplication.jobPost = selected;

    // Clear error message if a valid job post is selected
    if (selected && selected.id) {
      this.errorMessage = null;
    }

    // If a cover letter is selected and it belongs to a different job post, clear it.
    const currentCL = this.args.jobApplication.coverLetter;
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
