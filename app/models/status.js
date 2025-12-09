import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class StatusModel extends Model {
  @attr status;
  @attr createdAt;
  @attr statusType; // don't remember what I was going to do with this
  @belongsTo('job-application', {async: true, inverse: 'statuses'}) jobApplication;
}
