import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { infinityModel } from '../../utils/list-model';

export default class ScrapesIndexRoute extends Route {
  @service infinity;

  queryParams = {
    search: { refreshModel: true },
  };

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
  }

  // Suppress the loading substate when the transition is an in-route
  // refresh (search debounce updating the `search` query param).
  // scrapes/index-loading.hbs has no <:subnav> slot, so without this
  // the search input is torn down on every keystroke — visible
  // subnav flicker plus focus loss. Initial entry (transition.from
  // is null or a different route) still shows the skeleton.
  @action
  loading(transition) {
    if (transition.from && transition.from.name === this.routeName) {
      return false;
    }
    return true;
  }

  model({ search }) {
    return infinityModel(this, 'scrape', {
      perPage: 20,
      startingPage: 1,
      include: 'job-post,company',
      // Newest first — including in-flight rows that haven't got a
      // scraped_at yet (status=hold/pending). Scrape has no created_at
      // column (see api views/scrapes.py); -id is the reliable proxy.
      sort: '-id',
      // JSON:API sparse fieldsets — list rendering only needs these.
      // Drops job_content, html, css_selectors, apply_candidates from
      // every row; without this filter the response was multi-MB.
      'fields[scrape]':
        'url,status,scraped_at,parse_method,external_link,latest_status_note,apply_url,apply_url_status,source_link',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
