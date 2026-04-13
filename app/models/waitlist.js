import Model, { attr } from '@ember-data/model';

export default class WaitlistModel extends Model {
  @attr('string') email;
  @attr('string') notes;
  @attr('date') createdAt;
  @attr('date') updatedAt;
}
