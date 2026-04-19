import Component from '@glimmer/component';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/template';
import { select } from 'd3-selection';
import 'd3-transition'; // side-effect: adds .transition() to d3-selection
import { scaleLinear } from 'd3-scale';
import { NODE_COLORS, NODE_LABELS, FALLBACK_COLOR } from './colors';

const W = 720;
const ROW_HEIGHT = 28;
const ROW_GAP = 8;
const MARGIN = { top: 16, right: 80, bottom: 36, left: 180 };
const AXIS_TICKS = 5;
const TRANSITION_MS = 400;

function labelFor(bucket) {
  return NODE_LABELS[bucket] || bucket;
}

function colorFor(bucket) {
  return NODE_COLORS[bucket] || FALLBACK_COLOR;
}

export default class SourcesStackedBarComponent extends Component {
  el = null;

  get bucketOrder() {
    return this.args.bucketOrder || Object.keys(NODE_COLORS);
  }

  get rows() {
    return this.args.rows || [];
  }

  @action
  setupSvg(el) {
    this.el = el;
    this._render();
  }

  @action
  rerenderOnArgsChange() {
    if (this.el) this._render();
  }

  _render() {
    const rows = this.rows;
    const order = this.bucketOrder;
    const svg = select(this.el);
    svg.selectAll('*').remove();

    if (!rows.length) return;

    const maxTotal = Math.max(1, ...rows.map((r) => r.total || 0));
    const chartWidth = W - MARGIN.left - MARGIN.right;
    const x = scaleLinear().domain([0, maxTotal]).range([0, chartWidth]);
    const height =
      MARGIN.top + MARGIN.bottom + rows.length * (ROW_HEIGHT + ROW_GAP);

    svg.attr('viewBox', `0 0 ${W} ${height}`).attr('class', 'w-full h-auto');

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

    // Rows (hostname label + segments + total label).
    const rowGroups = g
      .selectAll('g.row')
      .data(rows)
      .join('g')
      .attr('class', 'row')
      .attr(
        'transform',
        (_, i) => `translate(0, ${i * (ROW_HEIGHT + ROW_GAP)})`,
      );

    // Hostname label (y-axis-side).
    rowGroups
      .append('text')
      .attr('x', -8)
      .attr('y', ROW_HEIGHT / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 12)
      .attr('class', 'fill-gray-700 dark:fill-gray-200')
      .text((d) =>
        d.hostname.length > 28 ? d.hostname.slice(0, 27) + '…' : d.hostname,
      );

    rowGroups.append('title').text((d) => `${d.hostname} — ${d.total} posts`);

    rowGroups.each(function (row) {
      let cursor = 0;
      const node = select(this);
      for (const bucket of order) {
        const count = row.buckets?.[bucket] || 0;
        if (!count) continue;
        const width = x(count);
        if (width <= 0) continue;
        const seg = node
          .append('rect')
          .attr('x', x(cursor))
          .attr('y', 0)
          .attr('height', ROW_HEIGHT)
          .attr('fill', colorFor(bucket))
          .attr('width', 0);
        seg.transition().duration(TRANSITION_MS).attr('width', width);
        const pct = Math.round((count / row.total) * 100);
        seg.append('title').text(`${labelFor(bucket)} — ${count} (${pct}%)`);
        cursor += count;
      }
      // Total label at end of row.
      node
        .append('text')
        .attr('x', x(row.total) + 6)
        .attr('y', ROW_HEIGHT / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 12)
        .attr('class', 'fill-gray-500 dark:fill-gray-400')
        .text(row.total);
    });

    // X-axis: tick marks + labels along the bottom so the horizontal
    // scale is actually readable.
    const axisY = rows.length * (ROW_HEIGHT + ROW_GAP);
    const axisG = g.append('g').attr('transform', `translate(0, ${axisY})`);
    axisG
      .append('line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('stroke', 'currentColor')
      .attr('class', 'text-gray-300 dark:text-gray-600')
      .attr('stroke-width', 1);

    const ticks = x.ticks(AXIS_TICKS);
    const tick = axisG
      .selectAll('g.tick')
      .data(ticks)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d) => `translate(${x(d)}, 0)`);
    tick
      .append('line')
      .attr('y2', 4)
      .attr('stroke', 'currentColor')
      .attr('class', 'text-gray-400 dark:text-gray-500');
    tick
      .append('text')
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('class', 'fill-gray-500 dark:fill-gray-400')
      .text((d) => d);

    // Y-axis label.
    g.append('text')
      .attr('x', -MARGIN.left + 8)
      .attr('y', -6)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('class', 'fill-gray-500 dark:fill-gray-400 uppercase tracking-wide')
      .text('Source');

    // X-axis label.
    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', axisY + 32)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('class', 'fill-gray-500 dark:fill-gray-400 uppercase tracking-wide')
      .text('Posts');
  }

  get legendEntries() {
    const seen = new Set();
    const entries = [];
    for (const row of this.rows) {
      for (const bucket of Object.keys(row.buckets || {})) {
        if (seen.has(bucket)) continue;
        seen.add(bucket);
        const color = colorFor(bucket);
        entries.push({
          bucket,
          label: labelFor(bucket),
          color,
          swatchStyle: htmlSafe(`background-color: ${color};`),
        });
      }
    }
    const order = this.bucketOrder;
    entries.sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket));
    return entries;
  }
}
