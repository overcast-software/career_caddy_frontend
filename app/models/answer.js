import Model, { attr, belongsTo } from '@ember-data/model';
import { Pollable } from 'career-caddy-frontend/traits/pollable';

export default class AnswerModel extends Pollable(Model) {
  @attr content;
  @attr ai_assist;
  @attr favorite;
  @attr prompt;
  @attr('string') status;
  @attr('date') createdAt;
  @belongsTo('question', { async: true, inverse: 'answers' }) question;
}
