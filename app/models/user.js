import Model, { attr, hasMany } from '@ember-data/model';

export default class UserModel extends Model {
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') username;
  // Public-safe display label. The public `/<username>` profile (CC #51) reads
  // this off the AllowAny user resource (api emits `display_name`, snake-cased
  // by app/serializers/application.js → `displayName`). On the authenticated
  // `/me/` payload it may be absent, in which case the `name` getter (first +
  // last) is the fallback. Kept distinct from first/last so a public profile
  // can show a chosen handle without exposing the real name.
  @attr('string') displayName;
  @attr('string') password;
  @attr('string') email;
  @attr('string') phone;
  @attr('string') linkedin;
  @attr('string') github;
  @attr('string') address;
  @attr() links;
  @attr() onboarding;
  @attr('boolean') isGuest;
  @attr('boolean', { defaultValue: false }) isStaff;
  @attr('boolean', { defaultValue: true }) isActive;
  @hasMany('resume', { async: true, inverse: 'user' }) resumes;
  @hasMany('score', { async: true, inverse: 'user' }) scores;
  @hasMany('cover-letter', { async: true, inverse: 'user' }) coverLetters;
  @hasMany('job-application', { async: true, inverse: 'user' }) jobApplications;
  @hasMany('summary', { async: true, inverse: 'user' }) summaries;
  get name() {
    return `${this.firstName} ${this.lastName}`;
  }
}
