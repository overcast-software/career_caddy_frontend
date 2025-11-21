import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class StatusModel extends Model {
  @attr content;
  @belongsTo('question', {async: true, inverse: 'answers'}) question;


}
