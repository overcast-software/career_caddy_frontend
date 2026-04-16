import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { UploadFile } from 'ember-file-upload';
import { service } from '@ember/service';

export default class ResumesImportController extends Controller {
  @service spinner;
  @service session;
  @service store;
  @service flashMessages;
  @service router;
  @service poller;
  @service api;

  @tracked isUploading = false;
  @tracked uploadSucceeded = false;

  get uploadDisabled() {
    return this.isUploading || this.uploadSucceeded;
  }

  @action
  ingestResume(file) {
    this.isUploading = true;
    this.flashMessages.info('Uploading resume to be parsed...');

    const refreshIfNeeded =
      !this.session.accessToken && this.session.refreshToken
        ? this.session.refresh().catch(() => {})
        : Promise.resolve();

    refreshIfNeeded
      .then(() => {
        const url = `${this.api.baseUrl}resumes/ingest/`;
        const headers = this.api.headers();
        return new UploadFile(file).upload({ url, headers });
      })
      .then((response) => response.json())
      .then((data) => {
        const resumeId = data?.data?.id;
        if (!resumeId) throw new Error('No resume ID in response');

        this.store.pushPayload('resume', data);
        const resume = this.store.peekRecord('resume', resumeId);

        this.flashMessages.clearMessages();
        this.flashMessages.info('Resume uploaded. Parsing...', {
          sticky: true,
        });
        this.isUploading = false;
        this.spinner.begin({ label: 'Parsing resume…' });

        this.poller.watchRecord(resume, {
          isTerminal: (r) => ['completed', 'failed'].includes(r.status),
          onStop: (r) => {
            this.spinner.end();
            this.flashMessages.clearMessages();
            if (r.status === 'completed') {
              this.uploadSucceeded = true;
              this.flashMessages.success('Resume imported successfully.');
            } else {
              this.flashMessages.danger('Resume import failed.');
            }
          },
          onError: () => {
            this.spinner.end();
            this.flashMessages.clearMessages();
            this.flashMessages.danger(
              'Lost connection while importing resume.',
            );
          },
        });
      })
      .catch((error) => {
        this.flashMessages.clearMessages();
        this.flashMessages.danger(`Resume import failed: ${error}`);
        this.isUploading = false;
      });
  }
}
