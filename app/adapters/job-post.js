import ApplicationAdapter from './application';

export default class JobPostAdapter extends ApplicationAdapter {
  // Async hasMany('duplicateCandidates') is loaded explicitly by the
  // jp.show route via `jp.hasMany('duplicateCandidates').load()`. The
  // relationship resource lives at the sub-collection endpoint
  // /api/v1/job-posts/<id>/duplicate-candidates/ — there's no
  // relationships.duplicate-candidates link on the JP response itself,
  // so Ember Data wouldn't auto-discover the URL; this override
  // provides it for the explicit .load() / .reload() path.
  urlForFindHasMany(id, modelName, snapshot, relationshipName) {
    if (relationshipName === 'duplicateCandidates') {
      return this.buildURL(modelName, id) + 'duplicate-candidates/';
    }
    return super.urlForFindHasMany(...arguments);
  }
}
