// Liquid Fire transition map. Add named transitions here and reference
// them via {{#liquid-if … use=NAME}} or class-match selectors.

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

const SLIDE_DURATION_MS = 350;

export default function () {
  // Generic fade for any liquid-if / liquid-bind tagged as default.
  this.transition(this.hasClass('liquid-default'), this.use('fade'));

  // Directional tab swipe. Forward (earlier → later) slides left,
  // backward (later → earlier) slides right via reverse(). One rule
  // per earlier tab covers every later sibling so we don't write 30
  // individual pairs.
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

  // EXPERIMENT — top-level route explode. Applies to the application-
  // level <LiquidOutlet @class="top-outlet" />. The explode transition
  // cross-matches opted-in elements (data-explode-pin=<token>)
  // between old and new DOM trees; each matched pair flies from the
  // old position to the new. Elements the user hasn't pinned fall
  // through to the crossFade fallback at the bottom.
  //
  // To opt an element in on a route, add
  //   <h1 data-explode-pin="page-title">…</h1>
  // to its template. Elements sharing the same pin value across
  // routes animate as one.
  //
  // https://ember-animation.github.io/liquid-fire/transitions/explode
  this.transition(
    this.hasClass('top-outlet'),
    this.use(
      'explode',
      {
        pickBy: '[data-explode-pin]',
        use: ['flyTo', { duration: 350 }],
      },
      { use: ['crossFade', { duration: 280 }] },
    ),
  );
}
