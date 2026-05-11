import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { apiAction } from 'career-caddy-frontend/utils/api-action';

export default class ExperienceModel extends Model {
  @attr('string') location;
  @attr('string') title;
  @attr('string') summary;
  @attr('date') startDate;
  @attr('date') endDate;
  @belongsTo('resume', { async: true, inverse: 'experiences' }) resume;
  @belongsTo('company', { async: true, inverse: 'experiences' }) company;
  @hasMany('description', { async: true, inverse: null }) descriptions;

  reorderDescriptions(descriptionIds) {
    return apiAction(this, {
      method: 'POST',
      path: 'reorder-descriptions',
      data: { description_ids: descriptionIds },
    });
  }
}
