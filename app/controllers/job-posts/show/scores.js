import Controller from '@ember/controller';
import { service } from '@ember/service';
import { getOwner } from '@ember/owner';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsShowScoresController extends Controller {
  @service pollable;
  @service store;
  @service spinner;
  @service flashMessages;
  @service currentUser;
  @service router;

  queryParams = ['auto'];

  @tracked auto = null;
  @tracked selectedResume = CAREER_DATA_OPTION;
  @tracked instructions = '';
  _autoScoreHandled = false;

  get jobPost() {
    return getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
  }

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  @action isPending(record) {
    return this.pollable.isPending(record);
  }

  @action selectResume(resume) {
    this.selectedResume = resume;
  }

  @action updateInstructions(event) {
    this.instructions = event.target.value;
  }

  @action autoScoreIfRequested() {
    // Runs from on-insert (render pass). flashMessages.info + store
    // reads below would violate Ember's auto-tracking 'no writes during
    // read-in-same-computation' rule. Defer to a microtask so render
    // settles first.
    Promise.resolve().then(() => this._runAutoScore());
  }

  _runAutoScore() {
    if (this.auto !== '1') return;
    if (this._autoScoreHandled) return;
    this._autoScoreHandled = true;

    const jobPost = getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');

    // Use the live store.query result (route model) — hasMany cache can be
    // stale and would miss a score the server created during from-text ingest.
    const scores = Array.from(this.model || []);
    const existing = scores.find((s) => !s.belongsTo('resume').id());
    if (existing) {
      if (existing.status === 'completed') {
        this.flashMessages.success(
          `Opening your existing career-data score #${existing.id}.`,
        );
        this.router.replaceWith(
          'job-posts.show.scores.show',
          jobPost.id,
          existing.id,
        );
      }
      // pending/failed: leave it in the list; the scores template shows it
      return;
    }
    // No score exists yet — create one (e.g. AI client was unavailable during ingest).
    this.scoreResume();
  }

  @action async scoreResume() {
    const jobPost = getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
    const resumeId = this.selectedResume?.id;
    const resume = resumeId && resumeId !== '0' ? this.selectedResume : null;
    const newScore = this.store.createRecord('score', {
      resume,
      jobPost,
      user: this.currentUser.user,
      instructions: this.instructions,
    });
    try {
      this.spinner.begin({ label: 'Scoring…' });
      const saved = await newScore.save();
      this.instructions = '';
      if (!this.pollable.isTerminal(saved)) {
        this.pollable.poll(saved, {
          successMessage: 'Score ready.',
          failedMessage: 'Scoring failed.',
          onFailed: () => this.flashMessages.danger('Scoring failed.'),
          onError: () =>
            this.flashMessages.danger(
              'Lost connection while waiting for score.',
            ),
        });
      } else {
        this.spinner.end();
      }
    } catch (e) {
      this.spinner.end();
      newScore.unloadRecord();
      this.flashMessages.danger(
        e?.errors?.[0]?.detail ?? 'Failed to create score.',
      );
    }
  }
}
