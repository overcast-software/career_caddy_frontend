import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };
const TERMINAL_STATUSES = new Set(['completed', 'done', 'failed', 'error']);

export default class JobPostsShowSummariesController extends Controller {
  @service store;
  @service router;
  @service spinner;
  @service flashMessages;
  @service poller;

  @tracked selectedResume = CAREER_DATA_OPTION;
  @tracked pendingIds = new Set();

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  @action isPending(summary) {
    return this.pendingIds.has(summary.id);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    for (const id of this.pendingIds) {
      const record = this.store.peekRecord('summary', id);
      if (record) this.poller.stop(record);
    }
  }

  @action selectResume(resume) {
    this.selectedResume = resume;
  }

  @action async createSummary() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const resume = this.store.peekRecord('resume', this.selectedResume.id);
    const summary = this.store.createRecord('summary', {
      jobPost,
      resume,
      content: '',
    });
    try {
      const saved = await this.spinner.wrap(summary.save(), {
        label: 'Creating summary…',
      });
      if (!saved.content) {
        this._pollSummary(saved);
      }
    } catch {
      summary.unloadRecord();
      this.flashMessages.danger('Failed to create summary.');
    }
  }

  _pollSummary(summary) {
    this.pendingIds = new Set([...this.pendingIds, summary.id]);
    this.poller.watchRecord(summary, {
      isTerminal: (rec) => !!rec.content || TERMINAL_STATUSES.has(rec.active),
      onStop: () => {
        this.pendingIds = new Set(
          [...this.pendingIds].filter((id) => id !== summary.id),
        );
      },
      onError: () => {
        this.pendingIds = new Set(
          [...this.pendingIds].filter((id) => id !== summary.id),
        );
        this.flashMessages.danger('Lost connection while waiting for summary.');
      },
    });
  }
}
