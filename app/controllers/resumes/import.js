import Controller from '@ember/controller';
import { action } from '@ember/object';
import { UploadFile } from 'ember-file-upload';
import { service } from '@ember/service';

export default class ResumesImportController extends Controller {
  @service session;
  @service flashMessages;
  @action
  async ingestResume(file) {
    this.flashMessages.info(
      'Uploading Resume to cloud to be parsed.  this could take a moment.',
    );
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
    try {
      new UploadFile(file)
        .upload({
          url,
          headers,
        })
        .then((resume) => {
          console.log(resume);
          this.flashMessges.success('Resume imported');
        })
        .catch((error) => {
          this.flashMeessages.clearMessages();
          this.flashMessges.success(`Resume failed ${error}`);
        });
    } catch (error) {
      this.flashMessges.alert(`Resume failed ${error}`);
    }
  }
}
