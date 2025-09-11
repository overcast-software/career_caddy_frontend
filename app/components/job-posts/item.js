import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class JobPostsItemComponent extends Component {
  @service router;
  @service store;

  @tracked selectedResumeId = null;

  get currentUser() {
    // Prefer @user if passed; otherwise use the already-loaded application user
    return this.args.user ?? this.store.peekRecord('user', 1);
  }

  get resumes() {
    const resumes = this.currentUser?.resumes;
    if (!resumes) return [];
    return resumes.toArray ? resumes.toArray() : resumes;
  }
  get jobPost() {
    return this.args.jobPost;
  }

  get scores() {
    const userId = this.currentUser?.id;
    const jobPostId = this.jobPost?.id;
    if (!userId || !jobPostId) return [];
    return this.store.peekAll('score').filter((score) => {
      console.log(score.belongsTo('jobPost').id())
      return score.belongsTo('user').id() === userId &&
             score.belongsTo('jobPost').id() === jobPostId;
    });
  }

  get companyName() {
    const company = this.args.jobPost?.company;
    return company?.displayName ?? company?.name ?? '';
  }

  // collection helpers (used for next/previous)
  get collection() {
    return this.args.jobPosts ?? this.args.collection ?? [];
  }

  get index() {
    const cur = this.jobPost;
    if (!cur) return -1;
    return this.collection.findIndex((jp) => jp?.id === cur.id);
  }

  get hasPrevious() {
    return this.index > 0;
  }

  get hasNext() {
    return this.index >= 0 && this.index < this.collection.length - 1;
  }

  get previousJobPost() {
    return this.hasPrevious ? this.collection[this.index - 1] : null;
  }

  get nextJobPost() {
    return this.hasNext ? this.collection[this.index + 1] : null;
  }

  // derive an external application URL from related scrapes
  get applicationUrl() {
    const scrapes = this.jobPost?.scrapes;
    const first = scrapes?.objectAt ? scrapes.objectAt(0) : Array.isArray(scrapes) ? scrapes[0] : null;
    return first?.externalLink ?? first?.url ?? null;
  }

  get isScoreDisabled() {
    return !this.selectedResumeId;
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
  previous() {
    const target = this.previousJobPost;
    if (!target) return;
    if (typeof this.args.onPrevious === 'function') return this.args.onPrevious(target);
    if (target.id) this.router.transitionTo('job-posts.show', target.id);
  }

  @action
  next() {
    const target = this.nextJobPost;
    if (!target) return;
    if (typeof this.args.onNext === 'function') return this.args.onNext(target);
    if (target.id) this.router.transitionTo('job-posts.show', target.id);
  }

  @action
  score() {
    const jobPost = this.jobPost ?? this.args.jobPost;
    if (!jobPost) return;
    if (typeof this.args.onScore === 'function') return this.args.onScore(jobPost);
    this.router.transitionTo('scores.new');
  }

  @action
  apply() {
    const jobPost = this.jobPost ?? this.args.jobPost;
    if (!jobPost) return;
    if (typeof this.args.onApply === 'function') return this.args.onApply(jobPost);

    const url = this.applicationUrl;
    if (url) window.open(url, '_blank', 'noopener');
  }

  @action
  onResumeChange(event) {
    this.selectedResumeId = event.target.value;
    if (typeof this.args.onResumeChange === 'function') {
      this.args.onResumeChange(this.selectedResumeId);
    }
  }
}
