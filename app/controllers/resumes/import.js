import Controller from '@ember/controller';
import { action } from '@ember/object';
import { UploadFile } from 'ember-file-upload';
import { service } from '@ember/service';

export default class ResumesImportController extends Controller {
  @service session;
  @action
  async ingestResume(file) {
    debugger;
    try {
      let token = this.session?.accessToken;
      if (!token && this.session?.refreshToken) {
        try {
          await this.session.refresh();
          token = this.session.accessToken;
        } catch {
          // proceed without token; server may reject with 401
        }
      }

      const url = `${this.session.baseUrl}resumes/ingest/`;
      const headers = this.session.authorizationHeader
        ? { Authorization: this.session.authorizationHeader }
        : {};
      const response = await new UploadFile(file).upload({
        url,
        headers,
      });

      console.log(response);
      return response;
    } catch (error) {
      console.error(`File upload error: ${error}`);
      throw error;
    }
  }
}
