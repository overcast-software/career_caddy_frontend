import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Renders the Company.aliases sub-collection on /admin/companies/:id.
//
// Phase A self-FK shape (api PR #176): an "alias" of this Company is
// itself a Company resource whose ``canonical_id == this.id``. The
// admin/companies/show route requests ``include=aliases,canonical``
// so the relationship is materialized synchronously by first paint.
//
// Pattern matches <JobPosts::DuplicateCandidates>: hasMany('rel').value()
// + for...of (no .slice / .toArray / .objectAt per the project's
// Ember Data convention).
//
// When the Company is itself an alias (canonical is non-null), the
// panel surfaces an "Unmark — restore as canonical" button next to
// the amber notice that POSTs /companies/:id/unmark-as-alias-of/ via
// unmarkAsAliasOf. Forward direction (mark this as alias of another
// / mark another as alias of this) lives on
// /admin/companies/<id>/related — the relate-actions workspace
// reached via the "Find related companies →" button on the parent
// route.
export default class CompaniesAliasesPanelComponent extends Component {
  @service router;
  @service flashMessages;

  @tracked unmarking = false;

  get rows() {
    const live = this.args.company?.hasMany('aliases').value();
    if (!live) return [];
    const out = [];
    for (const alias of live) {
      if (!alias) continue;
      out.push({
        id: alias.id,
        name: alias.name,
        displayName: alias.displayName,
      });
    }
    return out;
  }

  get isAlias() {
    // belongsTo('canonical').value() returns the live record or null.
    // The api emits a `canonical` relationship linkage when the
    // company is itself aliased; null means this row IS canonical.
    return Boolean(this.args.company?.belongsTo('canonical').value());
  }

  @action
  confirmUnmark() {
    if (this.unmarking) return;
    const company = this.args.company;
    if (!company) return;
    const sourceName = company.name;
    const sourceId = company.id;
    this.unmarking = true;
    company
      .unmarkAsAliasOf()
      .then(() => {
        this.flashMessages.success(`Restored "${sourceName}" as canonical.`);
        // Stay on the same Company — it's canonical now. apiAction
        // auto-pushes the updated resource, so canonical flips to
        // null in the store and the @tracked relationship getters
        // re-render the panel (amber notice hides, mark-as-alias
        // affordance restores). transitionTo nudges the route so any
        // include= load also refreshes.
        this.router.transitionTo('admin.companies.show', sourceId);
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Failed to unmark';
        this.flashMessages.danger(`Unmark failed: ${detail}`);
      })
      .finally(() => {
        this.unmarking = false;
      });
  }
}
