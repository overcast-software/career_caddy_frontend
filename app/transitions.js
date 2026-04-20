// Liquid Fire transition map. Add named transitions here and reference
// them via {{#liquid-if … use=NAME}} or class-match selectors below.
export default function () {
  // Default fade for any liquid-if/liquid-bind that doesn't specify one.
  this.transition(this.hasClass('liquid-default'), this.use('fade'));

  // Tabbed outlet on /job-posts/:id — sibling route swaps slide
  // left-to-right. Dynamic direction (slide back vs forward based on
  // tab order) is a follow-up; the consistent 'toLeft' already reads
  // as motion without the jarring hard swap.
  this.transition(
    this.hasClass('tab-outlet'),
    this.use('toLeft', { duration: 240 }),
  );
}
