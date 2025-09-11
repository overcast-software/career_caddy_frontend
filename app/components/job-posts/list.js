import Component from '@glimmer/component';

export default class JobPostsListComponent extends Component {
  get jobPosts() {
    return this.args.jobPosts ?? [];
  }
}
