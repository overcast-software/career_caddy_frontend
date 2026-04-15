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
  @tracked links = [];
  @tracked isEditing = false;
  @tracked isSubmitting = false;
  @tracked copiedSnippetIndex = null;

  @action updateField(field, event) {
    this[field] = event.target.value;
  }

  @action edit() {
    this.isEditing = true;
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

  @action async copySnippet(index) {
    const link = this.links[index];
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      this.copiedSnippetIndex = index;
      setTimeout(() => {
        this.copiedSnippetIndex = null;
      }, 2000);
    } catch {
      this.flashMessages.danger('Failed to copy to clipboard.');
    }
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
    this.links = Array.isArray(user.links)
      ? user.links.map((l) => ({ ...l }))
      : [];
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
    user.links = this.links.filter((l) => l.name || l.url);

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
