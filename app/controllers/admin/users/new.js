import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class AdminUsersNewController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @tracked firstName = '';
  @tracked lastName = '';
  @tracked email = '';
  @tracked username = '';
  @tracked password = '';
  @tracked isStaff = false;

  @action
  async save(event) {
    event?.preventDefault();
    const user = this.store.createRecord('user', {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      username: this.username,
      password: this.password,
      isStaff: this.isStaff,
    });
    try {
      await user.save();
      this.flashMessages.success(`${user.name} created.`);
      this._reset();
      this.router.transitionTo('admin.users.index');
    } catch {
      this.flashMessages.danger('Failed to create user.');
      user.rollbackAttributes();
    }
  }

  @action
  cancel() {
    this._reset();
    this.router.transitionTo('admin.users.index');
  }

  _reset() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.username = '';
    this.password = '';
    this.isStaff = false;
  }
}
