import Model, { attr, hasMany } from '@ember-data/model';
export default class CompanyModel extends Model {
  @attr('string') name;
  @attr('string') displayName;
  @attr('string') note;
  @attr('number') jobPostsCount;
  @attr('number') jobApplicationsCount;
  @attr('number') scrapesCount;
  @attr('number') questionsCount;
  @attr('number') scoresCount;
  @hasMany('job-post', { async: true, inverse: 'company' }) jobPosts;

  get sortedJobPosts() {
    const posts = this.hasMany('jobPosts').value();
    if (!posts) return [];
    const arr = [];
    for (const p of posts) arr.push(p);
    return arr.sort((a, b) => {
      const da = new Date(a.postedDate || a.createdAt || 0);
      const db = new Date(b.postedDate || b.createdAt || 0);
      return db - da;
    });
  }
  @hasMany('scrape', { async: true, inverse: 'company' }) scrapes;
  @hasMany('question', { async: true, inverse: 'company' }) questions;
  @hasMany('experience', { async: true, inverse: 'company' }) experiences;
  @hasMany('job-application', { async: true, inverse: 'company' })
  jobApplications;

  get sortedJobApplications() {
    const apps = this.hasMany('jobApplications').value();
    if (!apps) return [];
    const arr = [];
    for (const a of apps) arr.push(a);
    return arr.sort((a, b) => {
      const da = new Date(a.appliedAt || a.createdAt || 0);
      const db = new Date(b.appliedAt || b.createdAt || 0);
      return db - da;
    });
  }
  @hasMany('score', { async: true, inverse: 'company' }) scores;
  @hasMany('project', { async: true, inverse: null }) projects;
}
