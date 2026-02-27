import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobPostsIndexController extends Controller {
  @tracked query = '';
  @tracked compact = true;
  @service flashMessages;

  showControls = false;
  @action
  onFilterChange({ query }) {
    this.query = query ?? '';
  }

  @action
  onCompactToggle(compact) {
    this.compact = !!compact;
  }

  get filteredCompanies() {
    // XXX not implemented
    const list = ArrayProxy.create({ content: this.model });
    // Filter if query is provided
    const q = (this.args.query ?? '').trim().toLowerCase();
    let filteredList = list;

    if (q) {
      filteredList = list.filter((jobPost) => {
        const searchableText = [
          jobPost.get('title'),
          jobPost.get('description'),
          jobPost.get('company.displayName'),
          jobPost.get('company.name'),
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(q);
      });
    }

    // Sort by date (newest first, DESC)
    const items = Array.isArray(filteredList)
      ? filteredList
      : filteredList?.toArray
        ? filteredList.toArray()
        : [];

    items.sort((a, b) => {
      const aDate = a.get ? a.get('postedDate') : a.postedDate;
      const bDate = b.get ? b.get('postedDate') : b.postedDate;

      const aTime =
        aDate instanceof Date
          ? aDate.getTime()
          : aDate
            ? new Date(aDate).getTime()
            : 0;
      const bTime =
        bDate instanceof Date
          ? bDate.getTime()
          : bDate
            ? new Date(bDate).getTime()
            : 0;

      return bTime - aTime; // DESC: newest first
    });

    return items;
  }
}
