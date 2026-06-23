import { modifier } from 'ember-modifier';

// Calls `onEnter` whenever the modified element scrolls into view. Used as a
// bottom-of-list sentinel to drive keyset infinite scroll with no load-more
// button (CC #51 public profile feed).
//
// Why not ember-infinity / <InfinityLoader> (the app's usual infinite scroll):
// that stack increments a page NUMBER, but the federated feed paginates by an
// opaque KEYSET CURSOR (page[after]=<meta.next_cursor>). The two don't compose,
// so this minimal IntersectionObserver bridge advances the cursor instead. The
// caller (app/controllers/profile.js) owns the cursor + re-entrancy guard.
//
// `rootMargin: '200px'` pre-fetches the next page just before the sentinel is
// actually visible, so scrolling feels seamless. The observer is created on
// insert and disconnected automatically when the element is torn down (the
// returned function is ember-modifier's destructor).
export default modifier(
  function inViewport(element, [onEnter]) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onEnter?.();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  },
  { eager: false },
);
