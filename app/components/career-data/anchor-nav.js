import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

// Compact subnav widget: shows the currently-scrolled sub-card's label +
// prev/next buttons. Entries come from the controller as a flat list
// (one per resume / Q&A / cover letter):
//   [{ id: 'resume-39', label: 'Douglas Headley' },
//    { id: 'qa-128',   label: 'Why do you want…' },
//    { id: 'cl-77',    label: 'Cover · Acme' }, …]
//
// IntersectionObserver tracks which anchor is closest to the top
// (rootMargin offsets the trigger line for a comfortable reading feel).
export default class CareerDataAnchorNavComponent extends Component {
  @tracked activeId = null;
  observer = null;
  visible = new Set();

  get entries() {
    return this.args.entries || [];
  }

  get activeIndex() {
    const i = this.entries.findIndex((e) => e.id === this.activeId);
    return i < 0 ? 0 : i;
  }

  get activeLabel() {
    return this.entries[this.activeIndex]?.label || '';
  }

  get hasPrev() {
    return this.activeIndex > 0;
  }

  get hasNext() {
    return this.activeIndex < this.entries.length - 1;
  }

  @action setup() {
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

    this.observer = new IntersectionObserver(
      (obs) => {
        for (const e of obs) {
          if (e.isIntersecting) this.visible.add(e.target.id);
          else this.visible.delete(e.target.id);
        }
        const orderedIds = this.entries.map((e) => e.id);
        const firstVisible = orderedIds.find((id) => this.visible.has(id));
        if (firstVisible) this.activeId = firstVisible;
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: 0 },
    );
    for (const e of this.entries) {
      const el = document.getElementById(e.id);
      if (el) this.observer.observe(el);
    }
    if (this.entries[0] && !this.activeId) {
      this.activeId = this.entries[0].id;
    }
  }

  _scrollTo(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  @action gotoPrev() {
    if (!this.hasPrev) return;
    this._scrollTo(this.entries[this.activeIndex - 1].id);
  }

  @action gotoNext() {
    if (!this.hasNext) return;
    this._scrollTo(this.entries[this.activeIndex + 1].id);
  }
}
