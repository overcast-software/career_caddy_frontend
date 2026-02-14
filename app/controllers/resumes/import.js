import Controller from '@ember/controller';
import { action } from '@ember/object';
import { UploadFile } from 'ember-file-upload';
import { service } from '@ember/service';

export default class ResumesImportController extends Controller {
  @service spinner;
  @service session;
  @service flashMessages;
  @service api;

  @action
  async ingestResume(file) {
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
      this.spinner.wrap(
        await new UploadFile(file).upload({
          url,
          headers,
        }),
      );
    } catch (error) {
      this.flashMessages.clearMessages();
      this.flashMessages.danger(`Resume failed ${error}`);
    }
  }
}
