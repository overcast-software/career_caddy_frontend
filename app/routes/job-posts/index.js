import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
    hostname: { refreshModel: true },
    stub: { refreshModel: true },
    source: { refreshModel: true },
    scored: { refreshModel: true },
    bucket: { refreshModel: true },
    excludeVettedBad: { refreshModel: true, as: 'exclude_vetted_bad' },
    includeClosed: { refreshModel: true, as: 'include_closed' },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  model({
    search,
    hostname,
    stub,
    source,
    scored,
    bucket,
    excludeVettedBad,
    includeClosed,
  }) {
    return this.infinity.model('job-post', {
      perPage: 20,
      startingPage: 1,
      include: 'company,scrapes,scores',
      sort: '-posted_date',
      ...(search ? { 'filter[query]': search } : {}),
      ...(hostname ? { 'filter[hostname]': hostname } : {}),
      ...(stub ? { 'filter[stub]': stub } : {}),
      ...(source ? { 'filter[source]': source } : {}),
      ...(scored ? { 'filter[scored]': scored } : {}),
      ...(bucket ? { 'filter[bucket]': bucket } : {}),
      ...(excludeVettedBad
        ? { 'filter[exclude_vetted_bad]': excludeVettedBad }
        : {}),
      // Default behavior: api hides closed posts. Pass include_closed=true
      // (toggle in subnav) to show all.
      ...(includeClosed === 'true' ? { include_closed: 'true' } : {}),
    });
  }
}
