import Controller from '@ember/controller';
import { service } from '@ember/service';
import { getOwner } from '@ember/owner';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsShowCoverLettersController extends Controller {
  @service pollable;
  @service store;
  @service spinner;
  @service flashMessages;

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

  @action async createCoverLetter() {
    const jobPost = getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
    const resume = this.store.peekRecord('resume', this.selectedResume.id);
    const cl = this.store.createRecord('cover-letter', {
      resume,
      jobPost,
      instructions: this.instructions,
    });
    try {
      this.spinner.begin({ label: 'Generating cover letter…' });
      const saved = await cl.save();
      this.instructions = '';
      if (!this.pollable.isTerminal(saved)) {
        this.pollable.poll(saved, {
          successMessage: 'Cover letter ready.',
          failedMessage: 'Cover letter generation failed.',
          onComplete: () => this.flashMessages.success('Cover letter ready.'),
          onFailed: () =>
            this.flashMessages.danger('Cover letter generation failed.'),
          onError: () =>
            this.flashMessages.danger(
              'Lost connection while waiting for cover letter.',
            ),
        });
      } else {
        this.spinner.end();
      }
    } catch {
      this.spinner.end();
      cl.unloadRecord();
      this.flashMessages.danger('Failed to create cover letter.');
    }
  }
}
