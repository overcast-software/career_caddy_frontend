import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Controller for /admin/companies/:company_id. Owns the Federation
// toggle; the relate-actions (merge-into / mark-as-alias both
// directions) moved into <Companies::SearchTable>.
export default class AdminCompaniesShowController extends Controller {
  @service flashMessages;

  // Phase 6a — federation toggle in-flight flag. Disables the
  // checkbox while the PATCH is pending so a double-click can't
  // queue two saves.
  @tracked savingFederation = false;

  // Phase 6a — staff Federation-enabled toggle. Standard Ember Data
  // PATCH (no apiAction verb) because ``federation_enabled`` is just
  // a model attribute on Company. Mirror of answers/show.js
  // toggleFavorite — flip the attribute, save, rollback on failure.
  @action
  toggleFederationEnabled(event) {
    if (this.savingFederation) return;
    const next = event.target.checked;
    const previous = this.model.federationEnabled;
    this.model.federationEnabled = next;
    this.savingFederation = true;
    this.model
      .save()
      .then(() => {
        this.flashMessages.success(
          next
            ? `Federation enabled for "${this.model.name}".`
            : `Federation disabled for "${this.model.name}".`,
        );
      })
      .catch((err) => {
        this.model.federationEnabled = previous;
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Failed to update federation: ${detail}`);
      })
      .finally(() => {
        this.savingFederation = false;
      });
  }
}
