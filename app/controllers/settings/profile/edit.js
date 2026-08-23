import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SettingsProfileEditController extends Controller {
  @service flashMessages;
  @service router;

  @tracked firstName = '';
  @tracked lastName = '';
  @tracked email = '';
  @tracked phone = '';
  @tracked linkedin = '';
  @tracked github = '';
  @tracked address = '';
  @tracked wizardEnabled = true;
  @tracked isSubmitting = false;

  @action updateField(field, event) {
    this[field] = event.target.value;
  }

  @action updateWizardEnabled(event) {
    this.wizardEnabled = Boolean(event.target.checked);
  }

  @action cancel() {
    this.router.transitionTo('settings.profile');
  }

  @action save(event) {
    event?.preventDefault();
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const user = this.model;
    user.firstName = this.firstName;
    user.lastName = this.lastName;
    user.email = this.email;
    user.phone = this.phone;
    // LinkedIn/GitHub stay canonical profile identity fields; they're also
    // seeded (pinned) into the Quick Copy manager and mirrored from there.
    user.linkedin = this.linkedin;
    user.github = this.github;
    user.address = this.address;
    user.onboarding = {
      ...(user.onboarding || {}),
      wizard_enabled: Boolean(this.wizardEnabled),
    };

    user
      .save()
      .then(() => {
        this.flashMessages.success('Profile updated.');
        this.router.transitionTo('settings.profile');
      })
      .catch(() => {
        this.flashMessages.danger('Failed to update profile.');
        user.rollbackAttributes();
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }
}
