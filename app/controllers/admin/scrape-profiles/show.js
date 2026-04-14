import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class AdminScrapeProfilesShowController extends Controller {
  @service flashMessages;
  @service router;

  @tracked extractionHints = '';
  @tracked pageStructure = '';
  @tracked cssSelectors = '';
  @tracked preferredTier = 'auto';
  @tracked enabled = true;

  @action
  updateField(field, event) {
    this[field] = event.target.value;
  }

  @action
  toggleEnabled() {
    this.enabled = !this.enabled;
  }

  @action
  async save(event) {
    event?.preventDefault();
    const profile = this.model;
    profile.extractionHints = this.extractionHints;
    profile.pageStructure = this.pageStructure;
    profile.preferredTier = this.preferredTier;
    profile.enabled = this.enabled;

    if (this.cssSelectors.trim()) {
      try {
        profile.cssSelectors = JSON.parse(this.cssSelectors);
      } catch {
        this.flashMessages.danger('CSS selectors must be valid JSON.');
        return;
      }
    } else {
      profile.cssSelectors = null;
    }

    try {
      await profile.save();
      this.flashMessages.success('Profile saved.');
    } catch {
      this.flashMessages.danger('Failed to save profile.');
    }
  }

  @action
  cancel() {
    this.router.transitionTo('admin.scrape-profiles.index');
  }
}
