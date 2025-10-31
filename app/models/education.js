import Model, { attr, belongsTo } from '@ember-data/model';

export default class EducationModel extends Model {
  @attr('string') degree;
  @attr('date') issueDate;
  @attr('string') institution;
  @attr('string') major;
  @attr('string') minor;
  @belongsTo('resume', { async: true, inverse: 'educations' }) resume;
}
