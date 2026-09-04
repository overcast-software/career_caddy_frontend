import Component from '@glimmer/component';
import { action } from '@ember/object';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';

// Below this width we treat the viewport as a phone and inset the wormholed
// dropdown so it can't butt against the screen edges. Mirrors Tailwind's md
// breakpoint (768px) used across the app.
const MOBILE_MAX_WIDTH = 767;
// Horizontal gutter (px) kept between the dropdown and each viewport edge.
const EDGE_GUTTER = 12;

/**
 * `<CcSelect>` is the one wrapper over ember-power-select's PowerSelect and
 * PowerSelectWithCreate. Every picker in the app renders through it so mobile
 * dropdown behaviour lives in a single file (CC-271), and so the eventual
 * ember-power-select 8 -> 9 upgrade (CC-274) is a one-file change.
 *
 * Pass `@withCreate={{true}}` to render PowerSelectWithCreate (adds
 * `@onCreate`/`@showCreateWhen`/`@buildSuggestion`); omit it for PowerSelect.
 * All other `@`-args pass straight through, and `...attributes` reaches the
 * trigger (e.g. `data-test-*`).
 */
export default class CcSelectComponent extends Component {
  get dropdownClass() {
    const base = 'cc-select-dropdown';
    return this.args.dropdownClass
      ? `${this.args.dropdownClass} ${base}`
      : base;
  }

  // Shared placement hook for every picker. On desktop it is the stock
  // ember-basic-dropdown calculation; below the md breakpoint it pins the
  // wormholed dropdown to a fixed gutter inset so a full-width trigger's
  // dropdown doesn't run hard to the viewport edge at phone widths (CC-271).
  @action
  calculatePosition(trigger, content, destination, options) {
    const pos = calculatePosition(trigger, content, destination, options);
    if (
      typeof window !== 'undefined' &&
      window.innerWidth <= MOBILE_MAX_WIDTH
    ) {
      pos.style = pos.style || {};
      pos.style.left = EDGE_GUTTER;
      pos.style.width = window.innerWidth - EDGE_GUTTER * 2;
      // width now fully determines the horizontal box; drop any right anchor
      // the default calc may have set so the two don't fight.
      delete pos.style.right;
    }
    return pos;
  }
}
