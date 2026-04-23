import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Legacy URL. Redirect to the Scrape tab under /job-posts/new.
export default class JobPostsScrapeRoute extends Route {
  @service router;

  beforeModel(transition) {
    const url = transition.to?.queryParams?.url;
    this.router.replaceWith(
      'job-posts.new.scrape',
      url ? { queryParams: { url } } : {},
    );
  }
}
