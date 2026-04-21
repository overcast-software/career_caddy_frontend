import Component from '@glimmer/component';
import { action } from '@ember/object';
import { select } from 'd3-selection';
import { scaleQuantize } from 'd3-scale';
import {
  DURATIONS,
  EASINGS,
} from 'career-caddy-frontend/utils/chart-animations';

// Calendar-specific timing: cells fade in week by week (left → right).
// One step per week column is tiny on its own but sums to a smooth
// wave across the full year.
const CELL_STEP_MS = 14;
const CELL_FADE_MS = DURATIONS.fast;
const YEAR_GAP_MS = 180;

// d3 calendar heatmap modeled on https://observablehq.com/@d3/calendar/2.
// Renders one small-multiple per year: rows of week columns × 7 day rows,
// each cell shaded by daily application count. Pure SVG, no event handlers
// beyond a <title> tooltip.

const CELL = 12; // px per day cell (square)
const CELL_GAP = 2;
const WEEK_W = CELL + CELL_GAP;
const YEAR_GAP = 24; // vertical space between small-multiples
const MONTH_LABEL_H = 18;
const DOW_LABEL_W = 28;

function weekOfYear(date) {
  // Sunday-based week index (0..53) relative to Jan 1 of the same year.
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - jan1) / 86400000);
  return Math.floor((dayOfYear + jan1.getDay()) / 7);
}

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

export default class ReportsActivityCalendarComponent extends Component {
  get days() {
    return this.args.days ?? [];
  }

  // Index server days by ISO string for O(1) lookup. Years each render
  // a full Jan 1 → Dec 31 grid; days outside the returned window fall
  // through to count=0 (blank cells).
  get countByDate() {
    const map = new Map();
    for (const d of this.days) map.set(d.date, d.count);
    return map;
  }

  // Every year touched by the returned window, expanded to full years
  // so the small-multiple always shows Jan through Dec.
  get years() {
    if (!this.days.length) return [];
    const seen = new Set();
    for (const d of this.days) seen.add(Number(d.date.slice(0, 4)));
    return [...seen].sort((a, b) => b - a);
  }

  get maxCount() {
    let max = 0;
    for (const d of this.days) if (d.count > max) max = d.count;
    return max || 1;
  }

  _yearDays(year) {
    const out = [];
    const cursor = new Date(year, 0, 1);
    while (cursor.getFullYear() === year) {
      const iso = `${year}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      out.push({
        date: iso,
        day: new Date(cursor),
        count: this.countByDate.get(iso) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }

  @action
  draw(el) {
    const svg = select(el);
    svg.selectAll('*').remove();

    const years = this.years;
    if (!years.length) return;

    // 4-step quantized ramp + explicit empty state. Pulls CSS variables
    // so light/dark mode theme switching reflashes the grid without a
    // rerender — the actual color values live in app.css (--activity-*).
    const fillScale = scaleQuantize()
      .domain([1, this.maxCount])
      .range([
        'var(--activity-1)',
        'var(--activity-2)',
        'var(--activity-3)',
        'var(--activity-4)',
      ]);
    const color = (count) =>
      count === 0 ? 'var(--activity-empty)' : fillScale(count);

    // Width: 54 weeks max per year.
    const width = DOW_LABEL_W + 54 * WEEK_W;
    const rowH = MONTH_LABEL_H + 7 * WEEK_W;
    const height = years.length * (rowH + YEAR_GAP) - YEAR_GAP;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg.attr('width', '100%');
    svg.style('max-width', `${width}px`);

    years.forEach((year, yearIdx) => {
      const entries = this._yearDays(year);
      const g = svg
        .append('g')
        .attr('transform', `translate(0, ${yearIdx * (rowH + YEAR_GAP)})`);

      // Each year starts a beat after the one above so the multi-year
      // stack fills in top-down rather than every year's wave racing
      // together.
      const yearDelay = yearIdx * YEAR_GAP_MS;

      // Year label (top-left)
      g.append('text')
        .attr('x', 0)
        .attr('y', MONTH_LABEL_H - 4)
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('fill', 'var(--text)')
        .text(year);

      // Month labels — always all 12 now that we expand each year.
      for (let mi = 0; mi < 12; mi++) {
        const first = new Date(year, mi, 1);
        const wk = weekOfYear(first);
        g.append('text')
          .attr('x', DOW_LABEL_W + wk * WEEK_W)
          .attr('y', MONTH_LABEL_H - 4)
          .attr('font-size', 10)
          .attr('fill', 'var(--muted)')
          .text(MONTHS[mi]);
      }

      // Day-of-week labels (Mon/Wed/Fri to avoid clutter)
      const dowOffsets = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };
      for (const [dow, label] of Object.entries(dowOffsets)) {
        g.append('text')
          .attr('x', 0)
          .attr('y', MONTH_LABEL_H + Number(dow) * WEEK_W + CELL - 2)
          .attr('font-size', 9)
          .attr('fill', 'var(--muted)')
          .text(label);
      }

      // Cells (every day Jan 1 → Dec 31). Each cell fades in with a
      // delay keyed by its week column so the year fills in as a
      // left-to-right wave.
      for (const entry of entries) {
        const wk = weekOfYear(entry.day);
        const dow = entry.day.getDay();
        const rect = g
          .append('rect')
          .attr('x', DOW_LABEL_W + wk * WEEK_W)
          .attr('y', MONTH_LABEL_H + dow * WEEK_W)
          .attr('width', CELL)
          .attr('height', CELL)
          .attr('rx', 2)
          .attr('ry', 2)
          .attr('fill', color(entry.count))
          .attr('opacity', 0);
        rect
          .append('title')
          .text(
            `${entry.date} — ${entry.count} application${entry.count === 1 ? '' : 's'}`,
          );
        rect
          .transition()
          .delay(yearDelay + wk * CELL_STEP_MS)
          .duration(CELL_FADE_MS)
          .ease(EASINGS.flow)
          .attr('opacity', 1);
      }
    });
  }
}
