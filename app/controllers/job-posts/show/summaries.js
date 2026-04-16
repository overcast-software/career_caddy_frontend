import PollableListController from 'career-caddy-frontend/controllers/pollable-list';
import { TERMINAL } from 'career-caddy-frontend/controllers/pollable';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsShowSummariesController extends PollableListController {
  @service router;
  @service spinner;

  recordType = 'summary';

  @tracked selectedResume = CAREER_DATA_OPTION;
  @tracked instructions = '';

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  isTerminal(rec) {
    return !!rec.content || TERMINAL.has(rec.active);
  }

  onRecordError() {
    this.flashMessages.danger('Lost connection while waiting for summary.');
  }

  @action selectResume(resume) {
    this.selectedResume = resume;
  }

  @action updateInstructions(event) {
    this.instructions = event.target.value;
  }

  @action async createSummary() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const resume = this.store.peekRecord('resume', this.selectedResume.id);
    const summary = this.store.createRecord('summary', {
      jobPost,
      resume,
      content: '',
      instructions: this.instructions,
    });
    try {
      const saved = await this.spinner.wrap(summary.save(), {
        label: 'Creating summary…',
      });
      this.instructions = '';
      if (!saved.content) {
        this.pollRecord(saved);
      }
    } catch {
      summary.unloadRecord();
      this.flashMessages.danger('Failed to create summary.');
    }
  }
}
