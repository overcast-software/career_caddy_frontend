import Model, { attr, belongsTo } from '@ember-data/model';

export default class JobApplicationStatusModel extends Model {
  @attr('string') status;
  @attr('string') statusType;
  @attr('string') note;
  @attr('string') reasonCode;
  @attr() createdAt;
  @attr() loggedAt;

  // API relationship key is "application", not "job-application"
  @belongsTo('job-application', { async: true, inverse: 'applicationStatuses' })
  application;
}
