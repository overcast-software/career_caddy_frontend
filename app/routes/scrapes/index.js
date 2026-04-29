import Route from '@ember/routing/route';
import { service } from '@ember/service';
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

  model({ search }) {
    return infinityModel(this, 'scrape', {
      perPage: 20,
      startingPage: 1,
      include: 'job-post,company',
      // Newest first — including in-flight rows that haven't got a
      // scraped_at yet (status=hold/pending). Scrape has no created_at
      // column (see api views/scrapes.py); -id is the reliable proxy.
      sort: '-id',
      ...(search ? { 'filter[query]': search } : {}),
    });
  }
}
