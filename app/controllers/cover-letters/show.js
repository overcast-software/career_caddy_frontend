import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { downloadResource } from 'career-caddy-frontend/utils/download';

export default class CoverLettersShowController extends Controller {
  @service pollable;
  @service store;
  @service session;
  @service flashMessages;

  isExporting = false;

  startPollingIfPending() {
    this.pollable.pollIfPending(this.model, {
      label: 'Generating cover letter…',
      successMessage: 'Cover letter ready.',
      failedMessage: 'Cover letter generation failed.',
      onFailed: () =>
        this.flashMessages.danger('Cover letter generation failed.'),
      onError: () =>
        this.flashMessages.danger(
          'Lost connection while waiting for cover letter.',
        ),
    });
  }

  @action async toggleFavorite() {
    this.model.favorite = !this.model.favorite;
    try {
      await this.model.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      const status = this.model.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Cover letter ${status} favorites`);
    } catch {
      this.model.favorite = !this.model.favorite;
      this.flashMessages.danger('Failed to update favorite status');
    }
  }

  @action async exportToDocx() {
    if (this.isExporting) {
      this.flashMessages.warning('Export already in progress.');
      return;
    }
    this.isExporting = true;
    try {
      const id = this.model.id;
      await downloadResource({
        adapter: this.store.adapterFor('cover-letter'),
        session: this.session,
        modelName: 'cover-letter',
        id,
        path: 'export',
        filename: `cover-letter-${id}.docx`,
      });
    } catch (e) {
      this.flashMessages.danger(e);
    } finally {
      this.isExporting = false;
    }
  }
}
