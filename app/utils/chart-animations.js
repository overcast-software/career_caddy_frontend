/**
 * Shared animation primitives for the reports charts.
 *
 * Every chart (sankey, stacked bar, calendar, score counters, etc.)
 * should pull its durations, easings, and transition helpers from here
 * so the app feels coherent instead of each chart picking its own
 * 350ms / quadOut / ad-hoc flair.
 *
 * Usage:
 *
 *   import { fadeIn, staggerByColumn, DURATIONS } from 'career-caddy-frontend/utils/chart-animations';
 *   fadeIn(selection);
 *   staggerByColumn(selection, (d) => d.depth);
 */
import 'd3-transition'; // side-effect: .transition() on selection
import { easeCubicOut, easeCubicIn, easeBackOut } from 'd3-ease';
import { interpolateNumber } from 'd3-interpolate';

// ---------------------------------------------------------------------------
// Tokens — shared across all chart animations so durations/eases feel
// coherent. Prefer these over raw numbers at call sites.
// ---------------------------------------------------------------------------

export const DURATIONS = {
  fast: 180,
  medium: 320,
  slow: 600,
};

export const EASINGS = {
  flow: easeCubicOut, // default for enter/update position tweens
  pop: easeBackOut.overshoot(1.4), // small bounce for emphasis (counters, stars)
  exit: easeCubicIn,
};

// Stagger step (ms) between siblings in a cascaded entry.
export const STAGGER_STEP = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fade a d3 selection in from opacity 0. Sets the starting opacity
 * synchronously and returns the transition for chaining.
 */
export function fadeIn(
  selection,
  { duration = DURATIONS.medium, delay = 0, ease = EASINGS.flow } = {},
) {
  selection.attr('opacity', 0);
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .attr('opacity', 1);
}

/**
 * Fade a selection out then remove it from the DOM.
 */
export function fadeOut(
  selection,
  { duration = DURATIONS.medium, ease = EASINGS.exit } = {},
) {
  return selection
    .transition()
    .duration(duration)
    .ease(ease)
    .attr('opacity', 0)
    .remove();
}

/**
 * Apply a per-item delay across a selection so children cascade in
 * left-to-right (or by whatever accessor returns). `keyFn(d, i)` should
 * return a small integer "group" — items with the same group get the
 * same delay; delay = group * step.
 */
export function staggerByColumn(
  selection,
  keyFn,
  {
    step = STAGGER_STEP,
    duration = DURATIONS.medium,
    ease = EASINGS.flow,
  } = {},
) {
  selection.attr('opacity', 0);
  return selection
    .transition()
    .duration(duration)
    .ease(ease)
    .delay((d, i) => (keyFn(d, i) || 0) * step)
    .attr('opacity', 1);
}

/**
 * Animate a path's stroke drawing itself from start → end, GitHub-graph
 * style. Uses the stroke-dasharray trick: set dasharray + dashoffset to
 * the full length, then tween dashoffset to 0.
 *
 * Call this after the path's `d` attribute is set.
 */
export function drawStroke(
  selection,
  { duration = DURATIONS.slow, delay = 0, ease = EASINGS.flow } = {},
) {
  return selection.each(function () {
    const len = this.getTotalLength ? this.getTotalLength() : 0;
    if (!len) return;
    const el = this;
    const sel = selection
      .filter(function () {
        return this === el;
      })
      .attr('stroke-dasharray', `${len} ${len}`)
      .attr('stroke-dashoffset', len);
    sel
      .transition()
      .duration(duration)
      .delay(delay)
      .ease(ease)
      .attr('stroke-dashoffset', 0)
      .on('end', function () {
        // Clear dash attrs after tween so the path reflows normally on
        // updates (e.g. hover, resize).
        this.removeAttribute('stroke-dasharray');
        this.removeAttribute('stroke-dashoffset');
      });
  });
}

/**
 * Tween a text selection's number content from `from` → `to` (integer).
 * Useful for totals / "7 applications" that should feel alive on first
 * render rather than popping in static.
 */
export function countUp(
  selection,
  {
    from = 0,
    to,
    duration = DURATIONS.slow,
    ease = EASINGS.pop,
    format = (v) => Math.round(v).toString(),
  } = {},
) {
  if (to == null) {
    throw new Error('countUp requires a target `to` value');
  }
  return selection
    .transition()
    .duration(duration)
    .ease(ease)
    .tween('count', function () {
      const self = this;
      const interp = interpolateNumber(from, to);
      return (t) => {
        self.textContent = format(interp(t));
      };
    });
}
