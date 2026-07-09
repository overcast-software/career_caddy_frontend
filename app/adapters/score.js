import ApplicationAdapter from './application';

// Sub-collection GET on a parent JobPost. When the query carries
// `jobPostId`, route to `/api/v1/job-posts/:jobPostId/scores/`, the
// RESTful nested index (JobPostViewSet.scores @action) — instead of the
// flat `/scores/?filter[job_post_id]=...` collection. The nested
// response ships ScoreSerializer resources with the `job-post`
// relationship, so the inverse jobPost.hasMany('scores') hydrates.
// Falls back to the default JSONAPIAdapter URL when no jobPostId is
// present, preserving the flat collection for any future caller.
export default class ScoreAdapter extends ApplicationAdapter {
  urlForQuery(query) {
    const jobPostId = query.jobPostId;
    if (jobPostId != null) {
      delete query.jobPostId;
      return this.buildURL('job-post', jobPostId) + 'scores/';
    }
    return super.urlForQuery(...arguments);
  }
}
