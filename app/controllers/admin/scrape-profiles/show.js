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
  // Drives the in-flight UI on the "Sharpen with browser" button. Flips
  // true on click, back to false in the .finally() arm so both the
  // success flash and the error flash leave the button re-enabled.
  @tracked sharpening = false;

  // The api 422s when no successful scrape exists for the hostname.
  // Pre-flighting that check off `lastSuccessAt` lets the button render
  // disabled with an explanatory tooltip instead of letting the user
  // mash it and get a flash.
  get canSharpen() {
    return Boolean(this.model?.lastSuccessAt);
  }

  get sharpenDisabledHint() {
    if (this.canSharpen) return null;
    return 'Capture a successful scrape for this hostname first.';
  }

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

  // Staff-only verb: POST /scrape-profiles/:id/sharpen/. Sends a force=false
  // payload — the api can re-run via the model method directly if a later
  // UI exposes that. v1 ships without follow-up polling; the operator
  // refreshes the page once the queued browser job lands its updates.
  // Uses .then()/.catch() per project convention.
  @action
  sharpenProfile() {
    if (this.sharpening || !this.model) return;
    this.sharpening = true;
    this.model
      .sharpen()
      .then(() => {
        this.flashMessages.success(
          'Browser sharpen queued — refresh in a minute to see updated selectors.',
        );
      })
      .catch((err) => {
        const status = err?.errors?.[0]?.status;
        const detail = err?.errors?.[0]?.detail || err?.message || err?.detail;
        if (status === '422' || status === 422) {
          this.flashMessages.danger(
            'No successful scrape found for this hostname yet.',
          );
        } else if (detail) {
          this.flashMessages.danger(`Sharpen failed: ${detail}`);
        } else {
          this.flashMessages.danger('Sharpen failed — see logs.');
        }
      })
      .finally(() => {
        this.sharpening = false;
      });
  }
}
