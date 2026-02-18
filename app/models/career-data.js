import Model from '@ember-data/model';
import { attr } from '@ember-data/model';

export default class CareerDataModel extends Model {
  @attr('string') data;
}
