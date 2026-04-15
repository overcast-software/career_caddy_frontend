import Model, { attr, belongsTo } from '@ember-data/model';

export default class AnswerModel extends Model {
  @attr content;
  @attr ai_assist;
  @attr favorite;
  @attr prompt;
  @attr('string') status;
  @attr('date') createdAt;
  @belongsTo('question', { async: true, inverse: 'answers' }) question;
}
