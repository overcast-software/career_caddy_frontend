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

// Including the loading substate so transitions through the skeleton
// don't drop into liquid-fire's default/no-op path — we slide from
// the same direction as a real tab swap.
const SWOOSH_ROUTES = [...TAB_ORDER, 'job-posts.show.loading'];

// Tab swoosh. Bumped from 240ms→500ms based on playtest feedback — the
// move is wide enough on typical viewports that anything shorter reads
// as an abrupt cut rather than motion.
const SLIDE_DURATION_MS = 500;

// Initial cold boot / deep link into a tab. Keep it a plain fade so
// there's no "drawer drops in after swoosh" artifact when a loading
// substate intervenes between mount and content resolution.
const COLD_BOOT_DURATION_MS = 220;

export default function () {
  // Default fade for any liquid-if/liquid-bind that doesn't specify one.
  this.transition(this.hasClass('liquid-default'), this.use('fade'));

  // Cold boot / refresh directly at a tab URL: no previous sibling to
  // slide from. Plain fade — avoids the perceived "drawer fires after
  // a swoosh" sequence when Ember briefly shows the loading substate
  // before the target tab's model resolves.
  this.transition(
    this.hasClass('tab-outlet'),
    this.toRoute(SWOOSH_ROUTES),
    this.onInitialRender(),
    this.use('fade', { duration: COLD_BOOT_DURATION_MS }),
  );

  // Directional tab swoosh: forward (earlier → later) slides left, back
  // (later → earlier) slides right. One rule per earlier tab covering
  // every later sibling plus the loading substate, so loading→scores
  // slides in the same direction as the click that triggered the
  // transition instead of falling through to a hard swap.
  for (let i = 0; i < TAB_ORDER.length - 1; i++) {
    const earlier = TAB_ORDER[i];
    const laterSiblings = TAB_ORDER.slice(i + 1);
    this.transition(
      this.hasClass('tab-outlet'),
      this.fromRoute([earlier, 'job-posts.show.loading']),
      this.toRoute(laterSiblings),
      this.use('toLeft', { duration: SLIDE_DURATION_MS }),
      this.reverse('toRight', { duration: SLIDE_DURATION_MS }),
    );
  }
}
