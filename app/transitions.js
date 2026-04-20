// Liquid Fire transition map. Add named transitions here and reference
// them via {{#liquid-if … use=NAME}} or class-match selectors below.

// Left-to-right tab order on /job-posts/:id. Keep in sync with
// components/job-posts/tabs.hbs — if the tab strip reorders, this
// must too or the slide direction inverts for the affected pair.
const TAB_ORDER = [
  'job-posts.show.job-applications',
  'job-posts.show.questions',
  'job-posts.show.scores',
  'job-posts.show.cover-letters',
  'job-posts.show.scrapes',
  'job-posts.show.summaries',
];

// Horizontal tab swoosh — tightened slightly from the 240ms first cut.
const SLIDE_DURATION_MS = 200;

// Initial-render animation: user refreshed or deep-linked into a tab,
// so there's no sibling to slide from. Drop the panel in from above
// like a drawer so the distinction registers.
const DRAWER_DURATION_MS = 220;

export default function () {
  // Default fade for any liquid-if/liquid-bind that doesn't specify one.
  this.transition(this.hasClass('liquid-default'), this.use('fade'));

  // Cold boot / refresh directly at a tab URL: no previous sibling to
  // slide from, so use a drawer drop instead of the horizontal swoosh.
  this.transition(
    this.hasClass('tab-outlet'),
    this.toRoute(TAB_ORDER),
    this.onInitialRender(),
    this.use('toDown', { duration: DRAWER_DURATION_MS }),
  );

  // Directional tab swoosh for in-app navigation: forward (earlier →
  // later) slides left, back (later → earlier) slides right. One rule
  // per earlier tab covering every later sibling; reverse() swaps
  // direction when the user walks the same pair backwards.
  for (let i = 0; i < TAB_ORDER.length - 1; i++) {
    const earlier = TAB_ORDER[i];
    const laterSiblings = TAB_ORDER.slice(i + 1);
    this.transition(
      this.hasClass('tab-outlet'),
      this.fromRoute(earlier),
      this.toRoute(laterSiblings),
      this.use('toLeft', { duration: SLIDE_DURATION_MS }),
      this.reverse('toRight', { duration: SLIDE_DURATION_MS }),
    );
  }
}
