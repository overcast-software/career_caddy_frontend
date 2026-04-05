import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ProjectModel extends Model {
  @attr('string') title;
  @attr('string') description;
  @attr('date') startDate;
  @attr('date') endDate;
  @attr('boolean') isActive;
  @attr('number') order;
  @belongsTo('resume', { async: true, inverse: 'projects' }) resume;
  @hasMany('description', { async: true, inverse: null }) descriptions;
}
