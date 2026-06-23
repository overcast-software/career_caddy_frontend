import ApplicationAdapter from './application';

export default class UserAdapter extends ApplicationAdapter {
  urlForQueryRecord(query) {
    let originalUrl = super.urlForQueryRecord(...arguments); // ".../users"
    if (query.me) {
      delete query.me;
      return `${originalUrl}/me`;
    }
    // Public profile lookup (CC #51): store.queryRecord('user', { username })
    // → GET /api/v1/users/:username/ (api PR #195, AllowAny). `username` is
    // consumed to build the path, never sent as a query param. The application
    // adapter whitelists this endpoint so it reaches the api while logged out.
    if (query.username) {
      const username = encodeURIComponent(query.username);
      delete query.username;
      return `${originalUrl}/${username}/`;
    }

    return originalUrl;
  }
}
