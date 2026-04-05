import Model, { attr } from '@ember-data/model';

export default class DescriptionModel extends Model {
  @attr('string') content;
  @attr('number') order;
}
