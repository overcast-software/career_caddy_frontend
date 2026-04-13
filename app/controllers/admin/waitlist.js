import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class AdminWaitlistController extends Controller {
  @service flashMessages;
  @service store;

  @action async deleteEntry(entry) {
    const email = entry.email;
    try {
      await entry.destroyRecord();
      this.flashMessages.success(`${email} removed from waitlist.`);
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to remove waitlist entry.');
      }
    }
  }

  @action async inviteEntry(entry) {
    const email = entry.email;
    try {
      const invitation = this.store.createRecord('invitation', { email });
      await invitation.save();
      entry.unloadRecord();
      this.flashMessages.success(`Invitation sent to ${email}.`);
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to send invitation.');
      }
    }
  }
}
