import Component from '@glimmer/component';

export default class UsersListComponent extends Component {
  get users() {
    return this.args.users ?? [];
  }
}
