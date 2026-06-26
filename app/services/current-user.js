import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { decodeUserId } from 'career-caddy-frontend/utils/jwt';
import { isExtensionPresent } from 'career-caddy-frontend/utils/wizard-storage';

export default class CurrentUserService extends Service {
  @service session;
  @service store;
  @tracked user = null;
  // The OnboardingModel record for the current user. Loaded by the
  // application route after `load()` resolves, refreshed by the wizard
  // route on entry. Components read it directly — there's no
  // dedicated onboarding service.
  @tracked onboarding = null;
  // Tracked mirror of the extension postMessage flag. Initial value
  // comes from sessionStorage (in case a prior tab already detected),
  // and the application route's `_handleExtensionPresent` flips it
  // when a fresh postMessage arrives — so templates re-render the
  // moment the extension announces itself.
  @tracked extensionPresent = isExtensionPresent();

  get isGuest() {
    return this.user?.isGuest ?? false;
  }

  // Single seam for the per-post Publish/Unpublish affordance (FRON-123): may
  // THIS user broadcast a job-post to the fediverse? v1 gate = is_staff, which
  // mirrors the staff-gated extension Tools tab (plan-extension-staff-tools-tab)
  // — the operator (Doug) is staff and sees the toggle; ordinary users are not
  // and never do. When cc-api lands the `federation_publish_ui` instance
  // capability ({off, operator_only, all_users}, surfaced on /me/ or
  // /healthcheck/), swap the body to read THAT capability so a self-hoster can
  // widen publishing to their own users. This getter is the ONE place to change
  // — every consumer (JobPosts::PublishToggle and any future list-row action)
  // gates on it.
  get canPublishToFediverse() {
    return this.user?.isStaff ?? false;
  }

  async load() {
    this.user = null;
    this.onboarding = null;
    if (!this.session.isAuthenticated) return;

    const token = this.session.accessToken;
    const userId = token ? decodeUserId(token) : null;
    if (!userId) return;

    this.user = await this.store.findRecord('user', userId);
  }

  /** Fetch (or refetch) the onboarding singleton. Tolerates absence
   * — guests, unauthenticated calls — by returning null without
   * throwing. */
  async loadOnboarding() {
    if (!this.session.isAuthenticated || !this.user || this.isGuest) {
      this.onboarding = null;
      return null;
    }
    try {
      this.onboarding = await this.store.queryRecord('onboarding', {});
      return this.onboarding;
    } catch {
      this.onboarding = null;
      return null;
    }
  }
}
