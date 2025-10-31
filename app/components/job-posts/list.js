import Component from '@glimmer/component';

export default class JobPostsListComponent extends Component {
  get jobPosts() {
    const list = Array.from(this.args.jobPosts ?? []);

    // Filter if query is provided
    const q = (this.args.query ?? '').trim().toLowerCase();
    let filteredList = list;

    if (q) {
      filteredList = list.filter((jobPost) => {
        const searchableText = [
          jobPost.title ?? '',
          jobPost.description ?? '',
          jobPost.company?.displayName ?? '',
          jobPost.company?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(q);
      });
    }

    // Sort by date (newest first)
    const dateFor = (jp) =>
      jp.postedDate ?? jp.extractionDate ?? jp.createdAt ?? new Date(0);
    filteredList.sort((a, b) => dateFor(b) - dateFor(a));

    return filteredList;
  }
}
