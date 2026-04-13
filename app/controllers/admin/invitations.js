import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class AdminInvitationsController extends Controller {
  @service flashMessages;

  @action async revokeInvitation(invitation) {
    const email = invitation.email;
    try {
      await invitation.destroyRecord();
      this.flashMessages.success(`Invitation for ${email} revoked.`);
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to revoke invitation.');
      }
    }
  }
}
