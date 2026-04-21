import Component from '@glimmer/component';
import { action } from '@ember/object';

// Keep --subnav-h on <html> in sync with the rendered subnav height so
// anchor jumps (scroll-padding-top: var(--subnav-h)) clear the bar
// exactly, including responsive breakpoints and content wrapping.
//
// Inline (per-route) render: the element mounts when the route mounts,
// so on-insert fires after the node is in the live DOM — no portal
// timing quirks (which is what broke option A on Firefox).
export default class MenusSubnavBarComponent extends Component {
  observer = null;
  el = null;

  @action track(element) {
    this.el = element;
    this._update();
    if (typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(() => this._update());
    this.observer.observe(element);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.observer?.disconnect();
    this.observer = null;
    try {
      document.documentElement.style.removeProperty('--subnav-h');
    } catch {
      /* ignore */
    }
  }

  _update() {
    if (!this.el) return;
    const h = this.el.getBoundingClientRect().height;
    if (!h) return;
    // 4px cushion so the anchor target's heading doesn't sit flush
    // against the subnav border — reads better at the reading line.
    document.documentElement.style.setProperty('--subnav-h', `${h + 4}px`);
  }
}
