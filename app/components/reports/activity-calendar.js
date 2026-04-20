import Component from '@glimmer/component';
import { action } from '@ember/object';
import { select } from 'd3-selection';
import { scaleSequential } from 'd3-scale';

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

function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

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

  // Group days by year so each year renders as its own small-multiple row.
  get groupedByYear() {
    const map = new Map();
    for (const d of this.days) {
      const year = d.date.slice(0, 4);
      if (!map.has(year)) map.set(year, []);
      map.get(year).push(d);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }

  get maxCount() {
    let max = 0;
    for (const d of this.days) if (d.count > max) max = d.count;
    return max || 1;
  }

  @action
  draw(el) {
    const svg = select(el);
    svg.selectAll('*').remove();

    const years = this.groupedByYear;
    if (!years.length) return;

    const color = scaleSequential()
      .domain([0, this.maxCount])
      .interpolator((t) => {
        // Soft emerald ramp; t=0 is a neutral empty cell.
        if (t === 0) return 'var(--surface-alt)';
        const lightness = 80 - 50 * t;
        return `hsl(160, 60%, ${lightness}%)`;
      });

    // Width: 54 weeks max per year.
    const width = DOW_LABEL_W + 54 * WEEK_W;
    const rowH = MONTH_LABEL_H + 7 * WEEK_W;
    const height = years.length * (rowH + YEAR_GAP) - YEAR_GAP;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg.attr('width', '100%');
    svg.style('max-width', `${width}px`);

    years.forEach(([year, entries], i) => {
      const g = svg
        .append('g')
        .attr('transform', `translate(0, ${i * (rowH + YEAR_GAP)})`);

      // Year label (top-left)
      g.append('text')
        .attr('x', 0)
        .attr('y', MONTH_LABEL_H - 4)
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('fill', 'var(--text)')
        .text(year);

      // Month labels
      const months = new Map();
      for (const entry of entries) {
        const date = parseISO(entry.date);
        const mi = date.getMonth();
        if (!months.has(mi)) {
          months.set(mi, weekOfYear(date));
        }
      }
      for (const [mi, wk] of months) {
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

      // Cells
      for (const entry of entries) {
        const date = parseISO(entry.date);
        const wk = weekOfYear(date);
        const dow = date.getDay();
        g.append('rect')
          .attr('x', DOW_LABEL_W + wk * WEEK_W)
          .attr('y', MONTH_LABEL_H + dow * WEEK_W)
          .attr('width', CELL)
          .attr('height', CELL)
          .attr('rx', 2)
          .attr('ry', 2)
          .attr('fill', color(entry.count))
          .attr('stroke', 'rgba(0,0,0,0.06)')
          .append('title')
          .text(
            `${entry.date} — ${entry.count} application${entry.count === 1 ? '' : 's'}`,
          );
      }
    });
  }
}
