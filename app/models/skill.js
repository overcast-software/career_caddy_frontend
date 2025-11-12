import Model, { attr, belongsTo } from '@ember-data/model';

export default class SkillModel extends Model {
  @attr('string') text;
  @attr('string') skillType;
  @attr('boolean') active;
  @belongsTo('resume', { async: false, inverse: 'skills' }) resume;
}
