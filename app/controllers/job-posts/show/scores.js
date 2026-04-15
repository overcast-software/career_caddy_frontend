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

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  get jobPost() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    return this.store.peekRecord('job-post', job_post_id);
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

  @action async scoreResume() {
    const resume = this.store.peekRecord('resume', this.selectedResume.id);
    const newScore = this.store.createRecord('score', {
      resume,
      jobPost: this.jobPost,
      user: this.currentUser.user,
    });
    try {
      const saved = await this.spinner.wrap(newScore.save(), {
        label: 'Requesting score…',
      });
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
