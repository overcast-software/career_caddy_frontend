import Model, { attr, belongsTo } from '@ember-data/model';

export default class ExperienceModel extends Model {
  @attr('string') company;
  @attr('string') title;
  @attr('string') content;
  @attr('date') startDate;
  @attr('date') endDate;
  @belongsTo('resume', { async: true, inverse: 'experiences' }) resume;
}
