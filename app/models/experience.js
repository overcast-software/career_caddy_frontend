import Model, { attr, belongsTo } from '@ember-data/model';

export default class ExperienceModel extends Model {
  @attr('string') location;
  @attr('string') title;
  @attr('string') content;
  @attr('date') startDate;
  @attr('date') endDate;
  @belongsTo('resume', { async: true, inverse: 'experiences' }) resume;
  @belongsTo('company', { async: true, inverse: 'experiences' }) company;
}
