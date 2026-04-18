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
  @tracked links = [];
  @tracked wizardEnabled = true;
  @tracked isSubmitting = false;

  get lastLinkIndex() {
    return this.links.length - 1;
  }

  @action updateField(field, event) {
    this[field] = event.target.value;
  }

  @action addLink() {
    this.links = [...this.links, { name: '', url: '' }];
  }

  @action updateLinkField(index, field, event) {
    const updated = this.links.map((link, i) =>
      i === index ? { ...link, [field]: event.target.value } : link,
    );
    this.links = updated;
  }

  @action removeLink(index) {
    this.links = this.links.filter((_, i) => i !== index);
  }

  @action updateWizardEnabled(event) {
    this.wizardEnabled = Boolean(event.target.checked);
  }

  @action cancel() {
    this.router.transitionTo('settings.profile');
  }

  @action
  async save(event) {
    event?.preventDefault();
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    const user = this.model;
    user.firstName = this.firstName;
    user.lastName = this.lastName;
    user.email = this.email;
    user.phone = this.phone;
    user.linkedin = this.linkedin;
    user.github = this.github;
    user.address = this.address;
    user.links = this.links.filter((l) => l.name || l.url);
    user.onboarding = {
      ...(user.onboarding || {}),
      wizard_enabled: Boolean(this.wizardEnabled),
    };

    try {
      await user.save();
      this.flashMessages.success('Profile updated.');
      this.router.transitionTo('settings.profile');
    } catch {
      this.flashMessages.danger('Failed to update profile.');
      user.rollbackAttributes();
    } finally {
      this.isSubmitting = false;
    }
  }
}
