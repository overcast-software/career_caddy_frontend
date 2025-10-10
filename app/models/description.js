import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class DescriptionModel extends Model {
  @attr('string') content;
  @attr('number') order;
  @belongsTo('experience', { async: true, inverse: 'descriptions' }) experience;
}
