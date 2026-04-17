import Controller from '@ember/controller';
import { service } from '@ember/service';
import { getOwner } from '@ember/owner';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsShowSummariesController extends Controller {
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

  @action async createSummary() {
    const jobPost = getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
    const resume = this.store.peekRecord('resume', this.selectedResume.id);
    const summary = this.store.createRecord('summary', {
      jobPost,
      resume,
      content: '',
      instructions: this.instructions,
    });
    try {
      this.spinner.begin({ label: 'Generating summary…' });
      const saved = await summary.save();
      this.instructions = '';
      if (!saved.content) {
        this.pollable.poll(saved, {
          isTerminal: (rec) => !!rec.content || TERMINAL.has(rec.active),
          successMessage: 'Summary ready.',
          failedMessage: 'Summary generation failed.',
          onError: () =>
            this.flashMessages.danger(
              'Lost connection while waiting for summary.',
            ),
        });
      } else {
        this.spinner.end();
      }
    } catch {
      this.spinner.end();
      summary.unloadRecord();
      this.flashMessages.danger('Failed to create summary.');
    }
  }
}
