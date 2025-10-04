import Model, { attr, belongsTo } from '@ember-data/model';

export default class ExperienceDescriptionModel extends Model {
  @attr('string') text;
  @attr('number') order;
  @belongsTo('experience', { async: true, inverse: 'descriptions' }) experience;
}
