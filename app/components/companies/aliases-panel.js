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
// Also exposes a staff-only "mark this Company as alias of another"
// affordance — POST /companies/:id/mark-as-alias-of/ via the
// markAsAliasOf model method (apiAction pattern). When the Company
// is itself an alias (canonical is non-null), the panel surfaces an
// "Unmark — restore as canonical" button next to the amber notice
// that POSTs /companies/:id/unmark-as-alias-of/ via unmarkAsAliasOf.
export default class CompaniesAliasesPanelComponent extends Component {
  @service store;
  @service router;
  @service flashMessages;

  @tracked aliasTarget = null;
  @tracked aliasing = false;
  @tracked unmarking = false;

  // PowerSelect requires @options even when @search is used (the
  // initial empty dropdown reads from this). Search-only flow.
  emptyOptions = [];

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

  // PowerSelect onSearch — async filter against the api. Mirrors the
  // merge-into search (controllers/admin/companies/show.js):
  // filter[query] = icontains on name and display_name; small page so
  // staff are pinpointing a known target, not browsing.
  searchCompanies = (term) => {
    if (!term || term.length < 2) return [];
    return this.store
      .query('company', {
        'filter[query]': term,
        'page[size]': 20,
      })
      .then((results) => {
        const sourceId = this.args.company?.id;
        const filtered = [];
        for (const c of results) {
          if (c.id !== sourceId) filtered.push(c);
        }
        return filtered;
      });
  };

  @action
  selectAliasTarget(company) {
    this.aliasTarget = company;
  }

  @action
  clearAliasTarget() {
    this.aliasTarget = null;
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

  @action
  confirmMarkAsAlias() {
    if (!this.aliasTarget || this.aliasing) return;
    const target = this.aliasTarget;
    const targetId = target.id;
    const sourceName = this.args.company.name;
    this.aliasing = true;
    this.args.company
      .markAsAliasOf(targetId)
      .then(() => {
        this.flashMessages.success(
          `Marked "${sourceName}" as alias of "${target.name}".`,
        );
        this.aliasTarget = null;
        // Send staff to the now-canonical record so they can see the
        // aggregated alias list under the canonical's panel.
        this.router.transitionTo('admin.companies.show', targetId);
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Mark-as-alias failed: ${detail}`);
      })
      .finally(() => {
        this.aliasing = false;
      });
  }
}
