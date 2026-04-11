import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SettingsIndexController extends Controller {
  @service flashMessages;

  @tracked firstName = '';
  @tracked lastName = '';
  @tracked email = '';
  @tracked phone = '';
  @tracked linkedin = '';
  @tracked github = '';
  @tracked address = '';
  @tracked isEditing = false;
  @tracked isSubmitting = false;

  @action updateField(field, event) {
    this[field] = event.target.value;
  }

  @action edit() {
    this.isEditing = true;
  }

  @action cancel() {
    const user = this.model;
    this.firstName = user.firstName ?? '';
    this.lastName = user.lastName ?? '';
    this.email = user.email ?? '';
    this.phone = user.phone ?? '';
    this.linkedin = user.linkedin ?? '';
    this.github = user.github ?? '';
    this.address = user.address ?? '';
    this.isEditing = false;
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

    try {
      await user.save();
      this.flashMessages.success('Profile updated.');
      this.isEditing = false;
    } catch {
      this.flashMessages.danger('Failed to update profile.');
      user.rollbackAttributes();
    } finally {
      this.isSubmitting = false;
    }
  }
}
