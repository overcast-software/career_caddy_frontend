import ApplicationAdapter from './application';

// Singleton-per-user adapter — the URL embeds `me` rather than the
// caller's numeric id so the client doesn't need to know its own id
// before calling. Both queryRecord and save() hit the same path; the
// server differentiates by HTTP verb.
export default class OnboardingAdapter extends ApplicationAdapter {
  urlForQueryRecord() {
    return `${this.buildURL()}users/me/onboarding`;
  }

  urlForUpdateRecord() {
    return `${this.buildURL()}users/me/onboarding`;
  }
}
