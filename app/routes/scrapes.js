import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Passthrough parent. The list lives in routes/scrapes/index.js
// (paginated, sparse fieldsets); the show in routes/scrapes/show.js.
// No model() here — navigating directly to /scrapes/:id must NOT
// trigger a list-wide findAll.
export default class ScrapesRoute extends Route {
  @service store;
  @service currentUser;
  @service flashMessages;
  @service router;

  beforeModel() {
    // Scraping is staff-only during alpha — the api 403s POST /api/v1/scrapes/
    // for non-staff anyway. Redirect them to the dashboard with a banner so
    // the route doesn't render an empty list and a broken "new" button.
    if (!this.currentUser.user?.isStaff) {
      this.flashMessages.warning(
        'Scraping is staff-only during alpha. Job posts you save from the extension show up under Job Posts.',
        { sticky: true },
      );
      this.router.replaceWith('index');
    }
  }
}
