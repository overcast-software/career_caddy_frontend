import ApplicationAdapter from './application';

export default class JobPostDuplicateCandidateAdapter extends ApplicationAdapter {
  urlForQuery(query) {
    const jobPostId = query.jobPostId;
    delete query.jobPostId;
    return this.buildURL('job-post', jobPostId) + 'duplicate-candidates/';
  }
}
