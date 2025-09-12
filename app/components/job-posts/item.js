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
    return this.store.findAll('job-post');
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
  async score() {
    const jobPost = this.jobPost ?? this.args.jobPost;
    const user = this.currentUser;
    const resumeId = this.selectedResumeId;

    if (!jobPost || !user || !resumeId) return;

    let resume = this.store.peekRecord('resume', resumeId);
    if (!resume) {
      resume = this.store.findRecord('resume', resumeId);
    }

    const newScore = this.store.createRecord('score', {
      resume,
      jobPost,
      user,
    });

    try {
      newScore.save();
    } catch (e) {
      // Optional: surface the error

      console.error('Failed to create score', e);
    }
  }

  @action
  summary(){
    const jobPost = this.jobPost ?? this.args.jobPost;
    const user = this.currentUser;
    const resumeId = this.selectedResumeId;
    if (!jobPost || !user || !resumeId) return;
    let resume = this.store.peekRecord('resume', resumeId);
    if (!resume) {
      resume = this.store.findRecord('resume', resumeId);
    }
    const newSummary = this.store.createRecord('summary', {
      resume,
      jobPost,
      user
    })
    newSummary.save()
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
  cover_letter(){
    const jobPost = this.jobPost ?? this.args.jobPost;
    const user = this.currentUser;
    const resumeId = this.selectedResumeId;
    if (!jobPost || !user || !resumeId) return;
    let resume = this.store.peekRecord('resume', resumeId);
    if (!resume) {
      resume = this.store.findRecord('resume', resumeId);
    }
    const newCoverLetter = this.store.createRecord('cover-letter', {
      resume,
      jobPost,
      user
    })
    newCoverLetter.save()
  }

  @action
  onResumeChange(event) {
    this.selectedResumeId = event.target.value;
    if (typeof this.args.onResumeChange === 'function') {
      this.args.onResumeChange(this.selectedResumeId);
    }
  }
}
