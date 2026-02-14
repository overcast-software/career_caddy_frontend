import Model, { attr, belongsTo } from '@ember-data/model';

export default class ApiKeyModel extends Model {
  @attr('string') name;
  @attr('string') keyPrefix;
  @attr('string') key; // Only available during creation
  @attr('date') createdAt;
  @attr('date') expiresAt;
  @attr('date') revokedAt;
  @attr('boolean') isRevoked;
  @attr('array') scopes;
  @belongsTo('user', { async: false, inverse: null }) user;

  get isExpired() {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  get isActive() {
    return !this.isRevoked && !this.isExpired;
  }

  get statusText() {
    if (this.isRevoked) return 'Revoked';
    if (this.isExpired) return 'Expired';
    return 'Active';
  }

  get statusClass() {
    if (this.isRevoked) return 'text-red-600';
    if (this.isExpired) return 'text-yellow-600';
    return 'text-green-600';
  }
}
