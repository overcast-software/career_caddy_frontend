import Model, { attr } from '@ember-data/model';

export default class JobPostDuplicateCandidateModel extends Model {
  @attr title;
  @attr('string') companyName;
  @attr('string') confidence;
  @attr matchSignals;
  @attr('string') frontendUrl;
}
