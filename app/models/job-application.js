import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class JobApplicationModel extends Model {
  @attr('date') appliedAt;
  @attr('string', { defaultValue: 'Saved' }) status;
  @attr('string') trackingUrl;
  @attr('string') notes;
  @belongsTo('user', { async: true, inverse: 'jobApplications' }) user;
  @belongsTo('job-post', { async: true, inverse: 'jobApplications' }) jobPost;
  @belongsTo('resume', { async: true, inverse: 'jobApplications' }) resume;
  @hasMany('cover-letter', { async: true, inverse: 'jobApplication' })
  coverLetters;
  @hasMany('question', { async: true, inverse: 'jobApplication' }) questions;
  @belongsTo('company', { async: true, inverse: 'jobApplications' }) company;
  get name() {
    return `${this.get('jobPost.company.name')}: ${this.get('jobPost.title')} `;
  }
  get jobPostCompany(){
    return this.get("jobPost.company")
  }

  get fetchCompany(){
    const funtimes = this.get('company') || this.jobPostCompany
    debugger
    return funtimes
  }
}
