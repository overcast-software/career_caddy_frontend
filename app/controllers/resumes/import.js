import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { UploadFile } from 'ember-file-upload';
import { service } from '@ember/service';

export default class ResumesImportController extends Controller {
  @service spinner;
  @service session;
  @service flashMessages;
  @service api;

  @tracked isUploading = false;

  @action
  async ingestResume(file) {
    this.isUploading = true;
    this.flashMessages.info(
      'Uploading Resume to cloud to be parsed.  this could take a moment.',
    );

    if (!this.session.accessToken && this.session.refreshToken) {
      try {
        await this.session.refresh();
      } catch {
        // proceed without token; server may reject with 401
      }
    }

    const url = `${this.api.baseUrl}resumes/ingest/`;
    const headers = this.api.headers();

    try {
      await this.spinner.wrap(
        new UploadFile(file)
          .upload({
            url,
            headers,
          })
          .then(() => this.flashMessages.success('Resume imported'))
          .catch((error) => {
            this.flashMessages.clearMessages();
            this.flashMessages.danger(`Resume failed ${error}`);
          }),
      );
    } finally {
      this.isUploading = false;
    }
  }
}
