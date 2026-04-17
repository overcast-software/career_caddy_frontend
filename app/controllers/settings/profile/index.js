import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SettingsProfileIndexController extends Controller {
  @service flashMessages;

  @tracked copiedSnippetIndex = null;
  @tracked copiedField = null;

  @action async copySnippet(index) {
    const link = this.model.links[index];
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

  @action async copyField(field) {
    const value = this.model[field];
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.copiedField = field;
      setTimeout(() => {
        this.copiedField = null;
      }, 2000);
    } catch {
      this.flashMessages.danger('Failed to copy to clipboard.');
    }
  }
}
