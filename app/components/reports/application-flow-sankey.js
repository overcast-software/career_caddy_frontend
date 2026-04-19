import Component from '@glimmer/component';
import { action } from '@ember/object';
import { select } from 'd3-selection';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { NODE_LABELS, NODE_COLORS } from './colors';

const W = 720;
const H = 460;
const MARGIN = { top: 16, right: 140, bottom: 16, left: 140 };

export default class ApplicationFlowSankeyComponent extends Component {
  el = null;

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
    const nodes = (this.args.nodes || []).map((n) => ({ ...n }));
    const links = (this.args.links || []).map((l) => ({ ...l }));
    if (!nodes.length || !links.length) {
      select(this.el).selectAll('*').remove();
      return;
    }

    const layout = sankey()
      .nodeId((d) => d.index)
      .nodeWidth(14)
      .nodePadding(18)
      .extent([
        [MARGIN.left, MARGIN.top],
        [W - MARGIN.right, H - MARGIN.bottom],
      ]);

    // d3-sankey resolves source/target by index when using nodeId(d.index)
    const indexed = nodes.map((n, i) => ({ ...n, index: i }));
    const graph = layout({
      nodes: indexed,
      links: links.map((l) => ({ ...l })),
    });

    const svg = select(this.el);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'w-full h-auto');

    // Links
    svg
      .append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => NODE_COLORS[d.target.id] || '#cbd5e1')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-width', (d) => Math.max(1, d.width));

    // Nodes
    const nodeG = svg.append('g').selectAll('g').data(graph.nodes).join('g');

    nodeG
      .append('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('height', (d) => Math.max(1, d.y1 - d.y0))
      .attr('width', (d) => d.x1 - d.x0)
      .attr('fill', (d) => NODE_COLORS[d.id] || '#64748b');

    // Value labels (above the node label)
    nodeG
      .append('text')
      .attr('x', (d) => (d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr('y', (d) => (d.y0 + d.y1) / 2 - 8)
      .attr('text-anchor', (d) => (d.x0 < W / 2 ? 'start' : 'end'))
      .attr('dominant-baseline', 'middle')
      .attr('class', 'fill-gray-900 dark:fill-gray-100')
      .attr('font-size', 16)
      .attr('font-weight', 600)
      .text((d) => d.value || 0);

    // Name labels (below the value)
    nodeG
      .append('text')
      .attr('x', (d) => (d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr('y', (d) => (d.y0 + d.y1) / 2 + 10)
      .attr('text-anchor', (d) => (d.x0 < W / 2 ? 'start' : 'end'))
      .attr('dominant-baseline', 'middle')
      .attr('class', 'fill-gray-500 dark:fill-gray-400')
      .attr('font-size', 11)
      .text((d) => NODE_LABELS[d.id] || d.id);
  }
}
