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
const MARGIN = { top: 16, right: 80, bottom: 28, left: 180 };
const TRANSITION_MS = 500;

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

    if (!rows.length) {
      svg.selectAll('*').remove();
      return;
    }

    const maxTotal = Math.max(1, ...rows.map((r) => r.total || 0));
    const chartWidth = W - MARGIN.left - MARGIN.right;
    const x = scaleLinear().domain([0, maxTotal]).range([0, chartWidth]);
    const height =
      MARGIN.top + MARGIN.bottom + rows.length * (ROW_HEIGHT + ROW_GAP);

    svg.attr('viewBox', `0 0 ${W} ${height}`).attr('class', 'w-full h-auto');

    // Persistent group — established once so data joins animate in place.
    let g = svg.select('g.chart');
    if (g.empty()) {
      g = svg
        .append('g')
        .attr('class', 'chart')
        .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);
    }

    // Flatten rows × bucket segments so d3 can key-join segments across
    // renders. Each segment carries its row for positioning.
    const segments = [];
    for (const row of rows) {
      let cursor = 0;
      for (const bucket of order) {
        const count = row.buckets?.[bucket] || 0;
        if (!count) {
          continue;
        }
        segments.push({
          key: `${row.hostname}|${bucket}`,
          hostname: row.hostname,
          bucket,
          count,
          total: row.total,
          cursor,
        });
        cursor += count;
      }
    }

    // Row groups (hostname label + total). Key by hostname so reorder
    // across filter changes animates in place.
    const rowSel = g
      .selectAll('g.row')
      .data(rows, (d) => d.hostname)
      .join(
        (enter) => {
          const r = enter.append('g').attr('class', 'row').attr('opacity', 0);
          r.append('text').attr('class', 'label');
          r.append('text').attr('class', 'total');
          r.append('title');
          r.call((s) =>
            s.transition().duration(TRANSITION_MS).attr('opacity', 1),
          );
          return r;
        },
        (update) => update,
        (exit) =>
          exit.call((s) =>
            s.transition().duration(TRANSITION_MS).attr('opacity', 0).remove(),
          ),
      );

    rowSel
      .transition()
      .duration(TRANSITION_MS)
      .attr(
        'transform',
        (_, i) => `translate(0, ${i * (ROW_HEIGHT + ROW_GAP)})`,
      );

    rowSel
      .select('text.label')
      .attr('x', -8)
      .attr('y', ROW_HEIGHT / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 12)
      .attr('class', 'label fill-gray-700 dark:fill-gray-200')
      .text((d) =>
        d.hostname.length > 28 ? d.hostname.slice(0, 27) + '…' : d.hostname,
      );

    rowSel.select('title').text((d) => `${d.hostname} — ${d.total} posts`);

    rowSel
      .select('text.total')
      .attr('y', ROW_HEIGHT / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 12)
      .attr('class', 'total fill-gray-500 dark:fill-gray-400')
      .text((d) => d.total)
      .transition()
      .duration(TRANSITION_MS)
      .attr('x', (d) => x(d.total) + 6);

    // Segments — a single flat selection keyed by hostname|bucket so
    // color-by-outcome pieces persist across renders for a smooth
    // re-layout when filters narrow the data.
    let segG = g.select('g.segments');
    if (segG.empty()) {
      segG = g.append('g').attr('class', 'segments');
    }

    const rowIndex = new Map(rows.map((r, i) => [r.hostname, i]));

    segG
      .selectAll('rect.segment')
      .data(segments, (d) => d.key)
      .join(
        (enter) =>
          enter
            .append('rect')
            .attr('class', 'segment')
            .attr('y', (d) => rowIndex.get(d.hostname) * (ROW_HEIGHT + ROW_GAP))
            .attr('height', ROW_HEIGHT)
            .attr('fill', (d) => colorFor(d.bucket))
            .attr('x', (d) => x(d.cursor))
            .attr('width', 0)
            .call((s) =>
              s
                .transition()
                .duration(TRANSITION_MS)
                .attr('width', (d) => x(d.count)),
            ),
        (update) =>
          update.call((s) =>
            s
              .transition()
              .duration(TRANSITION_MS)
              .attr(
                'y',
                (d) => rowIndex.get(d.hostname) * (ROW_HEIGHT + ROW_GAP),
              )
              .attr('x', (d) => x(d.cursor))
              .attr('width', (d) => x(d.count)),
          ),
        (exit) =>
          exit.call((s) =>
            s.transition().duration(TRANSITION_MS).attr('width', 0).remove(),
          ),
      );

    // Tooltips (native <title>) live on the <rect> but need to be (re)applied
    // per render since the counts change.
    segG.selectAll('rect.segment').each(function (d) {
      const pct = d.total ? Math.round((d.count / d.total) * 100) : 0;
      const sel = select(this);
      sel.selectAll('title').remove();
      sel.append('title').text(`${labelFor(d.bucket)} — ${d.count} (${pct}%)`);
    });
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
