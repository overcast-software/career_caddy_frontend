import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { infinityModel } from '../../../utils/list-model';

// Staff hub for the per-hostname scrape profile table. The original
// `findAll('scrape-profile')` pulled every row into memory on every
// visit — fine in dev, painful once profiles fan out across all the
// job-site hostnames we've ever touched. The route now fetches page 1
// via ember-infinity and lets the user pull more by scrolling the
// sentinel into view.
//
// Pattern mirrors /admin/companies/index — same query-param search,
// same infinityModel cache helper, same loading-substate suppression
// so the search input keeps focus across self-transitions. The api
// (`GET /scrape-profiles/?filter[query]=...`) does an icontains match
// against `hostname` server-side and orders by `-scrape_count` by
// default.
export default class AdminScrapeProfilesIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  // In-route refresh (debounce updating QPs) would render
  // index-loading.hbs, which has no <:subnav> slot — the search
  // input gets torn down + remounted, losing focus. Suppress the
  // substate for self-transitions; cold loads still get the
  // skeleton.
  @action
  loading(transition) {
    if (transition.from && transition.from.name === this.routeName) {
      return false;
    }
    return true;
  }

  model({ search }) {
    return infinityModel(this, 'scrape-profile', {
      perPage: 50,
      startingPage: 1,
      sort: '-scrape_count',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
