import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import cloneResume from 'career-caddy-frontend/utils/clone-resume';
import exportResumeToWord from 'career-caddy-frontend/utils/export-resume-to-word';

export default class ResumesShowController extends Controller {
  @service store;
  @service router;
  @service flashMessages;
  @service session;

  get isDirty() {
    return this.model?.isNew || this.model?.hasDirtyAttributes;
  }

  @action
  async cloneResume() {
    await cloneResume(
      this.store,
      this.router,
      this.flashMessages,
      this.model.id,
    );
  }

  @action
  async saveResume() {
    try {
      await this.model.save();
      this.flashMessages.success('Resume saved.');
    } catch {
      this.flashMessages.danger('Failed to save resume.');
    }
  }

  @action deleteResume() {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Resume deleted.');
        this.router.transitionTo('resumes');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete resume.');
        }
      });
  }

  isExporting = false;

  @action
  async exportToWord() {
    if (this.isExporting) return;
    this.isExporting = true;
    try {
      await exportResumeToWord(this.store, this.session, this.model.id);
    } catch (e) {
      alert?.(e?.message ?? 'Export failed');
    } finally {
      this.isExporting = false;
    }
  }
}
