import Model from '@ember-data/model';
import { attr } from '@ember-data/model';
import { tracked } from '@glimmer/tracking';

export default class CareerDataModel extends Model {
  @attr('string') data;
  // sections: [{ type, title, items: [...] }]
  //   resumes item:        { id, title, subtitle, markdown }
  //   qas item:            { id, question_id, question, answer }
  //   cover_letters item:  { id, job, company, created_at, content }
  // Backend fills this; frontend renders directly — no markdown parsing.
  @attr() sections;
  @attr() resumeIds;
  @attr() coverLetterIds;
  @attr() answerIds;

  @tracked isDirty = false;

  markDirty() {
    this.isDirty = true;
  }
}
