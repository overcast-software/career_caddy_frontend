import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };
const TERMINAL_STATUSES = new Set(['completed', 'done', 'failed', 'error']);

export default class JobPostsShowCoverLettersController extends Controller {
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

  get jobPost() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    return this.store.peekRecord('job-post', job_post_id);
  }

  @action isPending(coverLetter) {
    return this.pendingIds.has(coverLetter.id);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    for (const id of this.pendingIds) {
      const record = this.store.peekRecord('cover-letter', id);
      if (record) this.poller.stop(record);
    }
  }

  @action selectResume(resume) {
    this.selectedResume = resume;
  }

  @action async createCoverLetter() {
    const resume = this.store.peekRecord('resume', this.selectedResume.id);
    const cl = this.store.createRecord('cover-letter', {
      resume,
      jobPost: this.jobPost,
    });
    this.flashMessages.info('Creating cover letter…');
    try {
      const saved = await this.spinner.wrap(cl.save());
      if (!saved.status || !TERMINAL_STATUSES.has(saved.status)) {
        this._pollCoverLetter(saved);
      }
    } catch {
      cl.unloadRecord();
      this.flashMessages.alert('Failed to create cover letter.');
    }
  }

  _pollCoverLetter = (cl) => {
    this.pendingIds = new Set([...this.pendingIds, cl.id]);
    this.poller.watchRecord(cl, {
      isTerminal: (rec) => TERMINAL_STATUSES.has(rec.status),
      onStop: (rec) => {
        this.pendingIds = new Set(
          [...this.pendingIds].filter((id) => id !== cl.id),
        );
        if (rec.status === 'failed' || rec.status === 'error') {
          this.flashMessages.alert('Cover letter generation failed.');
        } else {
          this.flashMessages.success('Cover letter ready.');
        }
      },
      onError: () => {
        this.pendingIds = new Set(
          [...this.pendingIds].filter((id) => id !== cl.id),
        );
        this.flashMessages.alert(
          'Lost connection while waiting for cover letter.',
        );
      },
    });
  };
}
