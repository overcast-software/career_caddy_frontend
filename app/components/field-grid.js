import Component from '@glimmer/component';

/**
 * The canonical responsive field-pair primitive (CC-280).
 *
 * Renders a grid that is single-column below `md` (768px) and multi-column
 * at/above it, so dense field pairs stack on mobile instead of clipping.
 * This is the form analog of <ResponsiveList> — every form composes it
 * instead of hand-rolling `.field-row`, `.builder-form.two-col`, or a bare
 * `grid-cols-N`.
 *
 * @cols — number of columns at `md` and up (2, 3, or 4). Defaults to 2.
 *
 * Tailwind only generates class names it finds as literal strings in a
 * scanned source file, so the `md:grid-cols-*` variants are spelled out
 * here rather than interpolated. Keep them literal.
 *
 * `...attributes` passes through to the grid <div>, so callers can add a
 * gap override or extra classes (Ember merges the class attribute).
 */
const COLS_CLASS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

export default class FieldGridComponent extends Component {
  get colsClass() {
    return COLS_CLASS[this.args.cols] ?? COLS_CLASS[2];
  }
}
