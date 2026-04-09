import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class AdminUsersIndexController extends Controller {
  @service flashMessages;
  @service router;

  @action
  async toggleActive(user) {
    user.isActive = !user.isActive;
    try {
      await user.save();
      const state = user.isActive ? 'activated' : 'deactivated';
      this.flashMessages.success(`${user.name} ${state}.`);
    } catch {
      this.flashMessages.danger('Failed to update user.');
      user.rollbackAttributes();
    }
  }

  @action
  async toggleStaff(user) {
    user.isStaff = !user.isStaff;
    try {
      await user.save();
      const role = user.isStaff ? 'granted staff access' : 'revoked staff access';
      this.flashMessages.success(`${user.name} ${role}.`);
    } catch {
      this.flashMessages.danger('Failed to update user.');
      user.rollbackAttributes();
    }
  }

  @action
  async destroy(user) {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      await user.destroyRecord();
      this.flashMessages.success('User deleted.');
    } catch {
      this.flashMessages.danger('Failed to delete user.');
    }
  }
}
