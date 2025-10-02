import Model, { attr, belongsTo } from '@ember-data/model';

export default class CertificationModel extends Model {
  @attr('string') issuer;
  @attr('string') title;
  @attr('string') content;
  @attr('date') issueDate;

  @belongsTo('resume', { async: true, inverse: 'certifications' }) resume;
}
