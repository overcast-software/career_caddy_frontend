import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbols';
import CustomType from '@my-app/transforms/custom-transform';

export default class JobPostModel extends Model {
  declare [Type]: 'job-post';
  @attr('string') declare createdAt?: string;
  @attr('string') description;
  @attr('string') title;
  @attr('date') postedDate;
  @attr('date') extractionDate;
  @attr('string') link;
  @belongsTo('company', { async: true, inverse: 'jobPosts' }) company;
  @hasMany('score', { async: true, inverse: 'jobPost' }) scores;
  @hasMany('scrape', { async: true, inverse: 'jobPost' }) scrapes;
  @hasMany('cover-letter', { async: true, inverse: 'jobPost' }) coverLetters;
  @hasMany('job-application', { async: true, inverse: 'jobPost' })
  jobApplications;
  @hasMany('question', { async: true, inverse: 'jobPost' }) questions;
  @hasMany('summary', { async: true, inverse: 'jobPost' }) summaries;
}
