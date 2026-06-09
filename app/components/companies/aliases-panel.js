import Component from '@glimmer/component';

const SOURCE_BADGE = {
  extraction: {
    label: 'extraction',
    classes:
      'bg-accent-100 text-accent-700 ring-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:ring-accent-700',
  },
  manual: {
    label: 'manual',
    classes:
      'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700',
  },
  backfill: {
    label: 'backfill',
    classes:
      'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
  },
};

const FALLBACK_BADGE = SOURCE_BADGE.backfill;

// Pure renderer for Company.aliases on /admin/companies/:id. The
// alias collection is the async hasMany on Company — the route's
// model() requests it via ``include=aliases`` so by first paint the
// relationship is loaded. Pattern matches <JobPosts::DuplicateCandidates>:
// hasMany('rel').value() + for...of (no .slice / .toArray /
// .objectAt per the project's Ember Data convention).
export default class CompaniesAliasesPanelComponent extends Component {
  get rows() {
    const live = this.args.company?.hasMany('aliases').value();
    if (!live) return [];
    const out = [];
    for (const alias of live) {
      if (!alias) continue;
      const badge = SOURCE_BADGE[alias.source] || FALLBACK_BADGE;
      out.push({
        id: alias.id,
        name: alias.name,
        nameSlug: alias.nameSlug,
        sourceLabel: badge.label,
        sourceClasses: badge.classes,
        createdAt: alias.createdAt,
      });
    }
    return out;
  }
}
