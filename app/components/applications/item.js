import Component from '@glimmer/component';

export default class ApplicationsItem extends Component {
  get data() {
    if (this.args.data) {
      return this.args.data;
    }

    const application = this.args.application ?? this.args.model;
    const jobPost = this.args.jobPost ?? application?.jobPost ?? this.args.model?.jobPost;

    return {
      application,
      jobPost,
      users: this.args.users,
      resumes: this.args.resumes,
      coverLetters: this.args.coverLetters
    };
  }
}
