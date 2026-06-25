import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { setResumeStep } from 'career-caddy-frontend/utils/wizard-storage';

export default class WizardReviewRoute extends Route {
  @service store;

  activate() {
    setResumeStep('review');
  }

  async model() {
    // Resume ids are opaque NanoID strings (CC-77 #79), so the old
    // Number(id)-descending sort no longer maps to recency (NanoIDs
    // aren't monotonic and Resume carries no timestamp attr to sort by).
    // Return the live RecordArray as the api orders it — no .slice()
    // (Ember Data reactivity footgun). The single-resume wizard path
    // (the common case right after import) renders the only resume
    // regardless of order.
    return this.store.findAll('resume');
  }
}
