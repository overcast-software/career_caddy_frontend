import PollableListController from 'career-caddy-frontend/controllers/pollable-list';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsShowScoresController extends PollableListController {
  @service router;
  @service currentUser;
  @service spinner;

  recordType = 'score';

  @tracked selectedResume = CAREER_DATA_OPTION;
  @tracked instructions = '';

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  onRecordFailed() {
    this.flashMessages.danger('Scoring failed.');
  }

  onRecordError() {
    this.flashMessages.danger('Lost connection while waiting for score.');
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
      if (!this.isTerminal(saved)) {
        this.pollRecord(saved);
      }
    } catch (e) {
      newScore.unloadRecord();
      this.flashMessages.danger(
        e?.errors?.[0]?.detail ?? 'Failed to create score.',
      );
    }
  }
}
