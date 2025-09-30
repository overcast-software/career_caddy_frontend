import Component from '@glimmer/component';

export default class ExperiencesListComponent extends Component {
  get experiences() {
    return this.args.experiences ?? [];
  }
}
