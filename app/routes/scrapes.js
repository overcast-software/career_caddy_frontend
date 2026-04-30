import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Passthrough parent. The list lives in routes/scrapes/index.js
// (paginated, sparse fieldsets); the show in routes/scrapes/show.js.
// No model() here — navigating directly to /scrapes/:id must NOT
// trigger a list-wide findAll.
export default class ScrapesRoute extends Route {
  @service store;
}
