import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { UploadFile } from 'ember-file-upload';
import { getProfession } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardResumeController extends Controller {
  @service api;
  @service currentUser;
  @service flashMessages;
  @service poller;
  @service router;
  @service session;
  @service spinner;
  @service store;

  @tracked isUploading = false;
  @tracked uploadSucceeded = false;

  get profession() {
    return getProfession() || null;
  }

  get onboarding() {
    return this.currentUser.onboarding;
  }

  get resumeImported() {
    return Boolean(this.onboarding?.derived?.resume_imported);
  }

  /** A previously-started ingest still in-flight from another visit
   * to this step. Held on the OnboardingModel record so leaving and
   * returning re-attaches to the same poll. */
  get pendingResume() {
    const r = this.onboarding?.currentResume;
    if (!r) return null;
    if (['completed', 'failed'].includes(r.status)) return null;
    return r;
  }

  get uploadDisabled() {
    return (
      this.isUploading || this.uploadSucceeded || Boolean(this.pendingResume)
    );
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

        // Stash on the onboarding record so navigating away + back
        // re-attaches to the same in-flight resume.
        if (this.onboarding) this.onboarding.currentResume = resume;

        this.flashMessages.clearMessages();
        this.flashMessages.info('Resume uploaded. Parsing...', {
          sticky: true,
        });
        this.isUploading = false;
        this.spinner.begin({ label: 'Parsing resume…' });

        this.poller.watchRecord(resume, {
          isTerminal: (r) => ['completed', 'failed'].includes(r.status),
          onStop: async (r) => {
            this.spinner.end();
            this.flashMessages.clearMessages();
            if (this.onboarding) this.onboarding.currentResume = null;
            if (r.status === 'completed') {
              this.uploadSucceeded = true;
              this.flashMessages.success('Resume imported.');
              await this.currentUser.loadOnboarding();
              this.router.transitionTo('wizard.review');
            } else {
              this.flashMessages.danger('Resume import failed.');
            }
          },
          onError: () => {
            this.spinner.end();
            this.flashMessages.clearMessages();
            if (this.onboarding) this.onboarding.currentResume = null;
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
