import Component from '@glimmer/component';
import ArrayProxy from '@ember/array/proxy';

export default class JobPostsListComponent extends Component {
  get jobPosts() {
    const list = ArrayProxy.create({ content: this.args.jobPosts });

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
        aDate instanceof Date ? aDate.getTime() : (aDate ? new Date(aDate).getTime() : 0);
      const bTime =
        bDate instanceof Date ? bDate.getTime() : (bDate ? new Date(bDate).getTime() : 0);

      return bTime - aTime; // DESC: newest first
    });

    return items;
  }
}
