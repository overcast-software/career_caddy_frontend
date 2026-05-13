import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class DocsRoute extends Route {
  @service router;

  activate() {
    super.activate(...arguments);
    this.router.on('routeDidChange', this, this._scrollTopIfDocs);
  }

  deactivate() {
    super.deactivate(...arguments);
    this.router.off('routeDidChange', this, this._scrollTopIfDocs);
  }

  _scrollTopIfDocs(transition) {
    const to = transition?.to?.name || '';
    if (to !== 'docs' && !to.startsWith('docs.')) return;
    // The app shell pins html/body to 100vh + overflow:hidden — .course-main
    // is the actual scroll container. Scrolling window does nothing.
    const main = document.querySelector('.course-main');
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }
}
