import PollableListController from 'career-caddy-frontend/controllers/pollable-list';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsShowCoverLettersController extends PollableListController {
  @service router;
  @service spinner;

  recordType = 'cover-letter';

  @tracked selectedResume = CAREER_DATA_OPTION;
  @tracked instructions = '';

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  onRecordComplete() {
    this.flashMessages.success('Cover letter ready.');
  }

  onRecordFailed() {
    this.flashMessages.danger('Cover letter generation failed.');
  }

  onRecordError() {
    this.flashMessages.danger('Lost connection while waiting for cover letter.');
  }

  @action selectResume(resume) {
    this.selectedResume = resume;
  }

  @action updateInstructions(event) {
    this.instructions = event.target.value;
  }

  @action async createCoverLetter() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const resume = this.store.peekRecord('resume', this.selectedResume.id);
    const cl = this.store.createRecord('cover-letter', {
      resume,
      jobPost,
      instructions: this.instructions,
    });
    this.flashMessages.info('Creating cover letter…');
    try {
      const saved = await this.spinner.wrap(cl.save());
      this.instructions = '';
      if (!this.isTerminal(saved)) {
        this.pollRecord(saved);
      }
    } catch {
      cl.unloadRecord();
      this.flashMessages.danger('Failed to create cover letter.');
    }
  }
}
