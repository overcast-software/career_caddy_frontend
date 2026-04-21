import Component from '@glimmer/component';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/template';
import { select } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { stack, area, curveMonotoneX } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
import {
  DURATIONS,
  EASINGS,
} from 'career-caddy-frontend/utils/chart-animations';
import { NODE_COLORS, NODE_LABELS, FALLBACK_COLOR } from './colors';

const W = 720;
const H = 240;
const MARGIN = { top: 16, right: 16, bottom: 36, left: 44 };

function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default class ReportsActivityStackedComponent extends Component {
  get series() {
    return this.args.series;
  }

  get days() {
    return this.series?.days ?? [];
  }

  get buckets() {
    return this.series?.buckets ?? [];
  }

  get legendEntries() {
    return this.buckets.map((bucket) => {
      const color = NODE_COLORS[bucket] || FALLBACK_COLOR;
      return {
        bucket,
        label: NODE_LABELS[bucket] || bucket,
        color,
        swatchStyle: htmlSafe(`background-color: ${color};`),
      };
    });
  }

  @action
  draw(el) {
    const svg = select(el);
    svg.selectAll('*').remove();

    if (!this.days.length || !this.buckets.length) return;

    const parsed = this.days.map((d) => ({ ...d, date: parseISO(d.date) }));
    const stacker = stack().keys(this.buckets);
    const series = stacker(parsed);

    // Bail early when no events ever logged — empty stack draws nothing
    // anyway but this skips the axis shell so the card reads as empty.
    const ymax = max(series, (s) => max(s, (d) => d[1])) || 0;
    if (ymax === 0) return;

    const x = scaleTime()
      .domain([parsed[0].date, parsed[parsed.length - 1].date])
      .range([MARGIN.left, W - MARGIN.right]);
    const y = scaleLinear()
      .domain([0, ymax])
      .nice()
      .range([H - MARGIN.bottom, MARGIN.top]);

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'w-full h-auto');

    const areaGen = area()
      .x((d) => x(d.data.date))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(curveMonotoneX);

    // Paths — start at opacity 0, fade in bucket-by-bucket so the stack
    // layers read as building up (applied lands first, then interview,
    // then terminals). Matches the sankey's left→right reveal cadence.
    svg
      .append('g')
      .selectAll('path')
      .data(series)
      .join('path')
      .attr('fill', (s) => NODE_COLORS[s.key] || FALLBACK_COLOR)
      .attr('fill-opacity', 0.82)
      .attr('d', areaGen)
      .attr('opacity', 0)
      .append('title')
      .text((s) => NODE_LABELS[s.key] || s.key);
    svg
      .select('g')
      .selectAll('path')
      .transition()
      .delay((_, i) => i * 80)
      .duration(DURATIONS.medium)
      .ease(EASINGS.flow)
      .attr('opacity', 1);

    // Axes.
    const xAxis = axisBottom(x).ticks(6);
    const yAxis = axisLeft(y).ticks(4);

    svg
      .append('g')
      .attr('transform', `translate(0, ${H - MARGIN.bottom})`)
      .attr('class', 'text-gray-500 dark:text-gray-400 text-xs')
      .call(xAxis);

    svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, 0)`)
      .attr('class', 'text-gray-500 dark:text-gray-400 text-xs')
      .call(yAxis);
  }
}
