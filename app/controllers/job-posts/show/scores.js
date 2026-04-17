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

  @tracked selectedResume = CAREER_DATA_OPTION;
  @tracked instructions = '';

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

  @action async scoreResume() {
    const jobPost = getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
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
