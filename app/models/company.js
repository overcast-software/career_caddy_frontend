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
    // postedDate is a calendar string ("YYYY-MM-DD"); createdAt is an ISO
    // instant. Both sort correctly as strings (ISO 8601 is lexicographic),
    // and mixing them via `new Date(calendar_string)` would parse as UTC
    // midnight and drift under PST — avoid Date construction entirely.
    const key = (p) => p.postedDate || p.createdAt || '';
    return arr.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (ka === kb) return 0;
      return ka < kb ? 1 : -1;
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
    // Both appliedAt and createdAt are ISO instants from the API. Lexical
    // string compare = chronological (ISO 8601 property).
    const key = (a) => a.appliedAt || a.createdAt || '';
    return arr.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (ka === kb) return 0;
      return ka < kb ? 1 : -1;
    });
  }
  @hasMany('score', { async: true, inverse: 'company' }) scores;
  @hasMany('project', { async: true, inverse: null }) projects;
}
