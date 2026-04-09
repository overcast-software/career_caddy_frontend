import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class AdminUsersShowController extends Controller {
  @service flashMessages;
  @service router;

  @tracked firstName = '';
  @tracked lastName = '';
  @tracked email = '';
  @tracked isStaff = false;
  @tracked isActive = true;

  @action updateField(field, event) {
    this[field] = event.target.value;
  }

  @action toggleField(field) {
    this[field] = !this[field];
  }

  @action
  async save(event) {
    event?.preventDefault();
    const user = this.model;
    user.firstName = this.firstName;
    user.lastName = this.lastName;
    user.email = this.email;
    user.isStaff = this.isStaff;
    user.isActive = this.isActive;
    try {
      await user.save();
      this.flashMessages.success('User updated.');
      this.router.transitionTo('admin.users.index');
    } catch {
      this.flashMessages.danger('Failed to update user.');
      user.rollbackAttributes();
    }
  }

  @action
  cancel() {
    this.router.transitionTo('admin.users.index');
  }
}
