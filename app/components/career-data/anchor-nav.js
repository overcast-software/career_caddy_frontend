import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

// Compact subnav widget: shows the section currently in view + prev/next
// buttons that scrollIntoView the adjacent anchor. Sections come from the
// controller (@sections: [{id, title}, ...]).
//
// Tracking uses IntersectionObserver so we don't fight scroll events; the
// section whose card is closest to the top of the viewport is "current."
export default class CareerDataAnchorNavComponent extends Component {
  @tracked activeId = null;
  observer = null;
  visible = new Set();

  get sections() {
    return this.args.sections || [];
  }

  get activeIndex() {
    const i = this.sections.findIndex((s) => s.id === this.activeId);
    return i < 0 ? 0 : i;
  }

  get activeTitle() {
    return this.sections[this.activeIndex]?.title || '';
  }

  get hasPrev() {
    return this.activeIndex > 0;
  }

  get hasNext() {
    return this.activeIndex < this.sections.length - 1;
  }

  @action setup() {
    // Wait a tick for the cards to mount before wiring the observer.
    setTimeout(() => this._wireObserver(), 0);
  }

  @action refresh() {
    this.observer?.disconnect();
    this.observer = null;
    this.visible.clear();
    this.setup();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.observer?.disconnect();
    this.observer = null;
    this.visible.clear();
  }

  _wireObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
    if (this.observer) this.observer.disconnect();

    // rootMargin pulls the "trigger line" down from the top by ~1/3 of the
    // viewport so the active label changes as the heading passes a
    // comfortable reading line, not at the very top edge.
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) this.visible.add(e.target.id);
          else this.visible.delete(e.target.id);
        }
        // Pick the first section (in DOM order) that's currently visible.
        // Falls back to the closest-above section when nothing is visible
        // (rare — e.g. zoomed out).
        const orderedIds = this.sections.map((s) => s.id);
        const firstVisible = orderedIds.find((id) => this.visible.has(id));
        if (firstVisible) this.activeId = firstVisible;
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: 0 },
    );
    for (const s of this.sections) {
      const el = document.getElementById(s.id);
      if (el) this.observer.observe(el);
    }
    if (this.sections[0] && !this.activeId) {
      this.activeId = this.sections[0].id;
    }
  }

  _scrollTo(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  @action gotoPrev() {
    if (!this.hasPrev) return;
    this._scrollTo(this.sections[this.activeIndex - 1].id);
  }

  @action gotoNext() {
    if (!this.hasNext) return;
    this._scrollTo(this.sections[this.activeIndex + 1].id);
  }

  @action gotoId(id) {
    this._scrollTo(id);
  }
}
