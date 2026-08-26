import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class AdminInvitationsController extends Controller {
  @service flashMessages;

  // Bucket 1 (verb on a resource) via Invitation#resend → apiAction.
  //
  // This was a hand-built fetch against config.APP.API_HOST with a
  // hand-set Authorization header, which meant it forfeited everything
  // ApplicationAdapter.ajax provides: the ensureFreshToken preflight on
  // writes and the 401 → refresh → retry. On an expired JWT the admin
  // got a hard "Failed to resend" where every other verb in the app
  // transparently recovers — and this is an admin surface, where a
  // session has likelier been sitting idle.
  //
  // The migration also deletes the store.findAll('invitation', {reload})
  // that followed it. The api returns the updated Invitation resource,
  // apiAction pushes it into the store, and the record the table is
  // already rendering picks up the new expiry — so `status` flips
  // expired → pending without refetching the whole collection.
  //
  // Two-argument .then(onSuccess, onError) rather than .then().catch():
  // the failure handler must not also catch a throw from the success
  // handler, which is what produced the dual success-then-failure flash
  // in PR #172.
  @action resendInvitation(invitation) {
    const email = invitation.email;
    return invitation.resend().then(
      () => this.flashMessages.success(`Invitation resent to ${email}.`),
      (error) => {
        // 403 is already surfaced by the adapter's sticky warning —
        // adding a danger flash here would double it. Same guard as
        // revokeInvitation below.
        if (error?.status === 403) return;
        this.flashMessages.danger(
          error?.errors?.[0]?.detail || 'Failed to resend invitation.',
        );
      },
    );
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
