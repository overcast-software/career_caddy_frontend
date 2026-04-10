import Model from '@ember-data/model';
import { attr } from '@ember-data/model';
import { tracked } from '@glimmer/tracking';

export default class CareerDataModel extends Model {
  @attr('string') data;
  @attr() resumeIds;
  @attr() coverLetterIds;
  @attr() answerIds;

  @tracked isDirty = false;

  markDirty() {
    this.isDirty = true;
  }
}
