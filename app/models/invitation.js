import Model, { attr, belongsTo } from '@ember-data/model';

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
}
