import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import config from 'career-caddy-frontend/config/environment';

export default class AdminInvitationsController extends Controller {
  @service flashMessages;
  @service session;
  @service store;

  @action async resendInvitation(invitation) {
    const email = invitation.email;
    const host = config.APP.API_HOST || '';
    const ns = config.APP.API_NAMESPACE;
    const url = `${host}/${ns}/invitations/${invitation.id}/resend/`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.session.authorizationHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        const body = await resp.json();
        const detail = body?.errors?.[0]?.detail || 'Failed to resend.';
        this.flashMessages.danger(detail);
        return;
      }

      // Reload to pick up any expiry changes
      await this.store.findAll('invitation', { reload: true });
      this.flashMessages.success(`Invitation resent to ${email}.`);
    } catch {
      this.flashMessages.danger('Failed to resend invitation.');
    }
  }

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
