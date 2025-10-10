import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ExperienceModel extends Model {
  @attr('string') location;
  @attr('string') title;
  @attr('string') summary;
  @attr('date') startDate;
  @attr('date') endDate;
  @belongsTo('resume', { async: true, inverse: 'experiences' }) resume;
  @belongsTo('company', { async: false, inverse: 'experiences' }) company;
  @hasMany('description', { async: true, inverse: 'experience' }) descriptions;
}
