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
