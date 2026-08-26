import Model, { attr, belongsTo } from '@ember-data/model';
import { apiAction } from 'career-caddy-frontend/utils/api-action';

export default class InvitationModel extends Model {
  @attr('string') email;
  @attr('string') token;
  @attr('date') createdAt;
  @attr('date') acceptedAt;
  @attr('date') expiresAt;
  @belongsTo('user', { async: true, inverse: null }) createdBy;

  get status() {
    if (this.acceptedAt) return 'accepted';
    if (this.expiresAt && new Date() > this.expiresAt) return 'expired';
    return 'pending';
  }

  // Staff-only verb: POST /api/v1/invitations/:id/resend/
  // Re-sends the invite email and, when the invite had already
  // expired, pushes `expires_at` out another 7 days. No payload.
  // Returns the updated Invitation resource — auto-pushed through
  // apiAction, so the record the admin table is already rendering
  // gets the new expiry and `status` flips expired → pending without
  // a collection refetch.
  //
  // Errors are AdapterErrors: 400 if already accepted, 404 if the row
  // vanished, 502 if the mail send failed.
  resend() {
    return apiAction(this, { method: 'POST', path: 'resend' });
  }
}
