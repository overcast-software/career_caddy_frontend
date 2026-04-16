import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };
const TERMINAL_STATUSES = new Set(['completed', 'done', 'failed', 'error']);

export default class JobPostsShowScoresController extends Controller {
  @service store;
  @service router;
  @service currentUser;
  @service spinner;
  @service flashMessages;
  @service poller;

  @tracked selectedResume = CAREER_DATA_OPTION;
  // Set of record ids currently being polled
  @tracked pendingIds = new Set();
  @tracked instructions = '';

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  @action isPending(score) {
    return this.pendingIds.has(score.id);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    for (const id of this.pendingIds) {
      const record = this.store.peekRecord('score', id);
      if (record) this.poller.stop(record);
    }
  }

  @action selectResume(resume) {
    this.selectedResume = resume;
  }

  @action updateInstructions(event) {
    this.instructions = event.target.value;
  }

  @action async scoreResume() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    if (!job_post_id) {
      this.flashMessages.warning('Could not determine job post.');
      return;
    }
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const resumeId = this.selectedResume?.id;
    const resume =
      resumeId && resumeId !== '0'
        ? this.store.peekRecord('resume', resumeId)
        : null;
    const newScore = this.store.createRecord('score', {
      resume,
      jobPost,
      user: this.currentUser.user,
      instructions: this.instructions,
    });
    try {
      const saved = await this.spinner.wrap(newScore.save(), {
        label: 'Requesting score…',
      });
      this.instructions = '';
      if (!saved.status || !TERMINAL_STATUSES.has(saved.status)) {
        this._pollScore(saved);
      }
    } catch (e) {
      newScore.unloadRecord();
      this.flashMessages.danger(
        e?.errors?.[0]?.detail ?? 'Failed to create score.',
      );
    }
  }

  _pollScore(score) {
    this.pendingIds = new Set([...this.pendingIds, score.id]);
    this.poller.watchRecord(score, {
      isTerminal: (rec) => TERMINAL_STATUSES.has(rec.status),
      onStop: (rec) => {
        this.pendingIds = new Set(
          [...this.pendingIds].filter((id) => id !== score.id),
        );
        if (rec.status === 'failed' || rec.status === 'error') {
          this.flashMessages.danger('Scoring failed.');
        }
      },
      onError: () => {
        this.pendingIds = new Set(
          [...this.pendingIds].filter((id) => id !== score.id),
        );
        this.flashMessages.danger('Lost connection while waiting for score.');
      },
    });
  }
}
