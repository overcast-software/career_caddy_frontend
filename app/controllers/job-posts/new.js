import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import move from 'ember-animated/motions/move';
import opacity from 'ember-animated/motions/opacity';
import { easeOut } from 'ember-animated/easings/cosine';

// Left-to-right tab order on /job-posts/new. Keep aligned with the
// tab strip in templates/job-posts/new.hbs — reorder one, reorder both
// or the slide direction inverts.
const TAB_ORDER = [
  'job-posts.new.manual',
  'job-posts.new.scrape',
  'job-posts.new.paste',
];

const DESCRIPTORS = {
  'job-posts.new.manual':
    'Enter the details by hand when you already know the title, company, and description — fastest when the posting is in your head.',
  'job-posts.new.scrape':
    'Hand us a URL and a spare desktop somewhere on the network will open the page in a real browser and extract the posting. Flaky on sites that block bots.',
  'job-posts.new.paste':
    'Open the posting in another tab, select-all + copy, paste below. Works on LinkedIn and other scrape-resistant sites. Optionally include the URL so the post keeps a link.',
};

function tabPrefix(routeName) {
  if (!routeName) return null;
  return (
    TAB_ORDER.find((r) => routeName === r || routeName.startsWith(r + '.')) ??
    null
  );
}

export default class JobPostsNewController extends Controller {
  @service router;

  @tracked tabForward = true;
  @tracked activeTabKey = null;

  constructor() {
    super(...arguments);
    this.activeTabKey =
      tabPrefix(this.router.currentRouteName) ?? 'job-posts.new.paste';
    this.tabTransition = this.tabTransition.bind(this);
    this.descriptorTransition = this.descriptorTransition.bind(this);
    this._routeDidChange = () => {
      const current = tabPrefix(this.router.currentRouteName);
      if (!current || current === this.activeTabKey) return;
      const fromIdx = TAB_ORDER.indexOf(this.activeTabKey);
      const toIdx = TAB_ORDER.indexOf(current);
      if (fromIdx !== -1 && toIdx !== -1) {
        this.tabForward = toIdx > fromIdx;
      }
      this.activeTabKey = current;
    };
    this.router.on('routeDidChange', this._routeDidChange);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.router.off('routeDidChange', this._routeDidChange);
  }

  get activeDescriptor() {
    return {
      key: this.activeTabKey,
      text: DESCRIPTORS[this.activeTabKey] ?? '',
    };
  }

  *tabTransition({ insertedSprites, removedSprites }) {
    const forward = this.tabForward;
    const motions = [];
    for (const sprite of removedSprites) {
      const dx = forward
        ? -sprite.initialBounds.width
        : sprite.initialBounds.width;
      sprite.endTranslatedBy(dx, 0);
      motions.push(move(sprite, { easing: easeOut, duration: 350 }));
    }
    for (const sprite of insertedSprites) {
      const dx = forward ? sprite.finalBounds.width : -sprite.finalBounds.width;
      sprite.startTranslatedBy(dx, 0);
      motions.push(move(sprite, { easing: easeOut, duration: 350 }));
    }
    yield Promise.all(motions);
  }

  *descriptorTransition({ insertedSprites, removedSprites }) {
    yield Promise.all([
      ...insertedSprites.map((s) =>
        opacity(s, { from: 0, to: 1, duration: 220 }),
      ),
      ...removedSprites.map((s) => opacity(s, { to: 0, duration: 160 })),
    ]);
  }
}
