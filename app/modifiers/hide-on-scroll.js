import { modifier } from 'ember-modifier';

// Slides a sticky bar out of the way on scroll-down and brings it back on
// scroll-up, freeing a row of chrome while the user is reading (CC-269).
//
// WHY A MODIFIER AND NOT CSS: there is no scroll-direction selector. This is
// the only JS in the condensed-chrome phase (CC-260 doctrine: CSS does the
// heavy lifting).
//
// WHY IT DOES NOT LISTEN ON `window`: this app's shell sets html/body to
// 100dvh + overflow:hidden and gives `.course-main` its own overflow-y (see
// app.css `.course` / `.course-main`), so the WINDOW NEVER SCROLLS. A
// window-level listener here would simply never fire. The scroller is found
// by walking up from the modified element, with a document-level lookup as a
// fallback for the case where the bar is portalled out of the scroller.
//
// The show/hide itself is Tailwind utilities on the element, not a new CSS
// block: `transition-transform` (+ duration/easing) is applied once on
// install, and `-translate-y-full` is toggled.

const DEFAULTS = {
  // Ignore sub-pixel and rubber-band jitter; only a deliberate gesture
  // should move the bar.
  threshold: 8,
  // Never hide while the user is still near the top of the document —
  // otherwise the bar flickers away on the first flick of a short page.
  revealAbove: 24,
};

const TRANSITION_CLASSES = [
  'transition-transform',
  'duration-200',
  'ease-out',
  'will-change-transform',
];
const HIDDEN_CLASS = '-translate-y-full';

export default modifier(
  function hideOnScroll(element, positional, named) {
    const selector = named.scroller ?? '.course-main';
    const threshold = named.threshold ?? DEFAULTS.threshold;
    const revealAbove = named.revealAbove ?? DEFAULTS.revealAbove;

    const scroller =
      element.closest(selector) ??
      element.ownerDocument.querySelector(selector);

    // No scroller (e.g. a chromeless route, or a test that renders the bar
    // bare) — leave the bar permanently visible rather than half-wired.
    if (!scroller) return;

    element.classList.add(...TRANSITION_CLASSES);

    let last = scroller.scrollTop;

    const onScroll = () => {
      const top = scroller.scrollTop;
      const delta = top - last;

      if (Math.abs(delta) < threshold) return;
      last = top;

      if (delta > 0 && top > revealAbove) {
        element.classList.add(HIDDEN_CLASS);
      } else {
        element.classList.remove(HIDDEN_CLASS);
      }
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      element.classList.remove(HIDDEN_CLASS, ...TRANSITION_CLASSES);
    };
  },
  { eager: false },
);
