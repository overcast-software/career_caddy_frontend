import Component from '@glimmer/component';
import { action } from '@ember/object';
import { select } from 'd3-selection';
import { scaleTime, scalePoint } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import {
  DURATIONS,
  EASINGS,
  drawStroke,
} from 'career-caddy-frontend/utils/chart-animations';
import { NODE_COLORS, FALLBACK_COLOR } from './colors';

// Inline JobApplication status line-chart for one published post on the public
// /@dough profile (CC-106 #3). Plots the owner's application-status journey for
// THIS post over time: x = event time (`at`), y = status (ordinal, ordered by
// first chronological appearance so the line climbs as the application reaches
// new stages). Driven by the frozen wire contract
//   post.federation.timeline = [{ status: <name>, at: <ISO logged_at> }, ...]  // ascending
// lifted onto the model by app/serializers/application.js (per-resource meta).
// A direct copy-with-swap of <Reports::ActivityStacked> (stack()/area() →
// line()), reusing the shared chart-animations + colors palette.
//
// Null-safe drop discipline (mirrors the rich-card pills + the CC-105 Sankey):
//   • 0 / empty / all-malformed timeline → the template renders NOTHING (no
//     empty axis frame) because {{#if this.points.length}} gates the wrapper.
//   • single status → a labeled dot (the y-axis status label + one point), with
//     no degenerate time axis and no line.
// No logic in the constructor; all state derives via getters (conventions
// fe-no-logic-in-component-constructors / fe-ember-data-array-footguns — note
// `timeline` is a PLAIN array on meta, safe to iterate/map, never a RecordArray).

const W = 640;
const H = 168;
const MARGIN = { top: 14, right: 18, bottom: 28, left: 112 };

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtShort(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Map a status name onto the shared report palette. The api emits a human name
// (e.g. "Interview Scheduled"); the palette keys are lowercase single words, so
// match on the first word and fall back to the neutral color.
function colorForStatus(status) {
  const key = (status || '').toLowerCase().split(/\s+/)[0];
  return NODE_COLORS[key] || FALLBACK_COLOR;
}

// Shared axis cleanup: theme-aware text/tick color via currentColor (driven by
// the Tailwind text-* class), domain line removed, tick lines de-emphasized.
function styleAxis(g) {
  g.attr('class', 'text-gray-500 dark:text-gray-400 text-xs');
  g.select('.domain').remove();
  g.selectAll('.tick line')
    .attr('stroke', 'currentColor')
    .attr('stroke-opacity', 0.25);
  g.selectAll('.tick text').attr('fill', 'currentColor');
}

export default class ReportsJaTimelineComponent extends Component {
  // The frozen plain-array contract, defensively coerced. NOT a RecordArray —
  // it rides on per-resource meta.federation, so iterate/map freely.
  get timeline() {
    const tl = this.args.timeline;
    return Array.isArray(tl) ? tl : [];
  }

  // Valid, parseable events only — drops entries missing a status or a usable
  // timestamp so a half-formed row never poisons the scales.
  get points() {
    const pts = [];
    for (const entry of this.timeline) {
      const at = parseAt(entry?.at);
      if (!at || !entry?.status) continue;
      pts.push({ status: entry.status, at });
    }
    return pts;
  }

  // Distinct statuses in order of first (chronological) appearance — the y-axis
  // domain. The earliest-reached status sits at the bottom of the range, so the
  // line rises as the application reaches new stages.
  get statusDomain() {
    const seen = [];
    for (const p of this.points) {
      if (!seen.includes(p.status)) seen.push(p.status);
    }
    return seen;
  }

  @action
  draw(el) {
    const svg = select(el);
    svg.selectAll('*').remove();

    const points = this.points;
    if (!points.length) return; // null-safe drop (the template also gates)

    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const y = scalePoint()
      .domain(this.statusDomain)
      .range([H - MARGIN.bottom, MARGIN.top])
      .padding(0.6);

    // y status-label axis — rendered in every case (it IS the legend) so even a
    // single point reads as a *labeled* dot, never a bare mark.
    svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, 0)`)
      .call(axisLeft(y).tickSize(0).tickPadding(8))
      .call(styleAxis);

    // ── Single status → labeled dot, no time axis / no line ────────────────
    if (points.length === 1) {
      const p = points[0];
      const cx = (MARGIN.left + (W - MARGIN.right)) / 2;
      svg
        .append('circle')
        .attr('class', 'ja-timeline-dot')
        .attr('cx', cx)
        .attr('cy', y(p.status))
        .attr('r', 5)
        .attr('fill', colorForStatus(p.status))
        .attr('opacity', 0)
        .call((sel) =>
          sel.append('title').text(`${p.status} — ${fmtShort(p.at)}`),
        );
      svg
        .select('.ja-timeline-dot')
        .transition()
        .duration(DURATIONS.medium)
        .ease(EASINGS.flow)
        .attr('opacity', 1);
      svg
        .append('text')
        .attr('x', cx)
        .attr('y', H - MARGIN.bottom + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .attr('class', 'text-gray-500 dark:text-gray-400 text-xs')
        .text(fmtShort(p.at));
      return;
    }

    // ── Multi-point → time axis + connecting line + per-status dots ─────────
    const x = scaleTime()
      .domain([points[0].at, points[points.length - 1].at])
      .range([MARGIN.left, W - MARGIN.right]);

    const lineGen = line()
      .x((d) => x(d.at))
      .y((d) => y(d.status))
      .curve(curveMonotoneX);

    svg
      .append('path')
      .datum(points)
      .attr('class', 'ja-timeline-line text-blue-500 dark:text-blue-400')
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGen);
    // GitHub-graph style self-drawing reveal. The <path> element exists
    // synchronously regardless of the reveal animation, so test counts stay
    // stable; drawStroke no-ops when getTotalLength is unavailable.
    drawStroke(svg.select('.ja-timeline-line'), { duration: DURATIONS.slow });

    const dots = svg.append('g').attr('class', 'ja-timeline-dots');
    dots
      .selectAll('circle')
      .data(points)
      .join('circle')
      .attr('class', 'ja-timeline-dot')
      .attr('cx', (d) => x(d.at))
      .attr('cy', (d) => y(d.status))
      .attr('r', 4)
      .attr('fill', (d) => colorForStatus(d.status))
      .attr('opacity', 0)
      .append('title')
      .text((d) => `${d.status} — ${fmtShort(d.at)}`);
    dots
      .selectAll('circle')
      .transition()
      .delay((_, i) => i * 70)
      .duration(DURATIONS.medium)
      .ease(EASINGS.flow)
      .attr('opacity', 1);

    // x time axis — a few date ticks, domain line stripped for a clean inline
    // look.
    svg
      .append('g')
      .attr('transform', `translate(0, ${H - MARGIN.bottom})`)
      .call(
        axisBottom(x)
          .ticks(4)
          .tickFormat((d) => fmtShort(d)),
      )
      .call(styleAxis);
  }
}
