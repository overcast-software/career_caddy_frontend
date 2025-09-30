import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ResumeModel extends Model {
  @attr('string') content;
  @attr('string') filePath;
  @belongsTo('user', { async: false, inverse: null }) user;
  @hasMany('score', { async: false, inverse: null }) scores;
  @hasMany('cover-letter', { async: false, inverse: 'resume' }) coverLetters;
  @hasMany('application', { async: false, inverse: null }) applications;
  @hasMany('experience', { async: true, inverse: 'resume' }) experiences;
  @hasMany('summary', { async: false, inverse: 'resume' }) summaries;

  get summary() {
    // Find a Summary in the store that points at this resume (included via sideload)
    const s = this.store.peekAll('summary').find((rec) => rec.belongsTo('resume').id() === this.id);
    return s?.content ?? null;
  }
}
