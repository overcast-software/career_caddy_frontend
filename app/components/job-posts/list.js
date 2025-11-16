import Component from '@glimmer/component';
import ArrayProxy from '@ember/array/proxy';

export default class JobPostsListComponent extends Component {
  get jobPosts() {

    const list = ArrayProxy.create({content: this.args.jobPosts})

    // Filter if query is provided
    const q = (this.args.query ?? '').trim().toLowerCase();
    let filteredList = list;

    if (q) {
      filteredList = list.filter((jobPost) => {
        const searchableText = [
          jobPost.get("title"),
          jobPost.get('description'),
          jobPost.get('company.displayName'),
          jobPost.get('company.name'),
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(q);
      });
    }

    // Sort by date (newest first)
    filteredList.sortBy('postedDate')

    return filteredList;
  }
  toggleShowLoading(){
    this.args.showLoading = !this.args.showLoading
  }
}
