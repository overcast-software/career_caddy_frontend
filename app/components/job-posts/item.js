import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsItemComponent extends Component {
  @service router;
  @service store;
  @service currentUser;

  @tracked selectedResumeId = null;

  get loggedInUser() {
    return this.currentUser.user;
  }

  get jobPost() {
    return this.args.jobPost;
  }

  get companyName() {
    const company = this.args.jobPost?.company;
    return company.get('displayName') ?? company.name;
  }

  // derive an external application URL from related scrapes
  get applicationUrl() {
    const scrapes = this.jobPost?.scrapes;
    const first = scrapes?.objectAt
      ? scrapes.objectAt(0)
      : Array.isArray(scrapes)
        ? scrapes[0]
        : null;
    return first?.externalLink ?? first?.url ?? null;
  }

  @action
  edit() {
    const jobPost = this.jobPost ?? this.args.jobPost;
    if (!jobPost) return;
    if (typeof this.args.onEdit === 'function') {
      return this.args.onEdit(jobPost);
    }
    const id = jobPost.id;
    if (id) this.router.transitionTo('job-posts.edit', id);
  }

  @action
  async delete() {
    const jobPost = this.jobPost ?? this.args.jobPost;
    if (!jobPost) return;
    if (typeof this.args.onDelete === 'function') {
      return this.args.onDelete(jobPost);
    }
    if (window.confirm('Are you sure you want to delete this job post?')) {
      await jobPost.destroyRecord();
    }
  }

  @action
  onResumeChange(event) {
    this.selectedResumeId = event.target.value;
  }

  toggleLoading(){
    this.args.showLoading = !this.args.showLoading
  }
}
