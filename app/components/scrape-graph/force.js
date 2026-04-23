import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force';
import { zoom, zoomIdentity } from 'd3-zoom';

/**
 * d3 force-directed rendering of the full scrape-graph.
 *
 * Args:
 *   @structure   — { nodes: [{id, group, label, description}], edges: [{from, to}] }
 *   @trace       — ordered transitions for the current scrape; [] for
 *                  the admin overview. Each entry has graph_node and
 *                  graph_payload.routed_to.
 *   @onNodeClick — (optional) called with the node id on click.
 *
 * Note on imports: static imports are intentional. ember-auto-import's
 * rewriting of dynamic specifiers silently dropped `import('mermaid')`
 * and left the browser staring at a bare specifier. d3 submodules are
 * small enough (tens of kilobytes total) that the always-loaded cost
 * is fine.
 */
export default class ScrapeGraphForce extends Component {
  @tracked hoveredNode = null;

  _sim = null;
  _svg = null;
  _svgSelection = null;
  _zoomBehavior = null;

  // Group → [fill, stroke]. Visited nodes use the stroke as fill so
  // they read as 'filled-in' vs the light-muted default.
  _palette = {
    scrape: ['#dbeafe', '#3b82f6'],
    obstacle: ['#fee2e2', '#ef4444'],
    extract: ['#dcfce7', '#22c55e'],
    terminal: ['#e5e7eb', '#6b7280'],
  };

  get visitedNodes() {
    const set = new Set();
    const trace = this.args.trace || [];
    for (const row of trace) {
      set.add(row.graph_node);
      const routed = row.graph_payload?.routed_to;
      if (routed && routed !== 'End') set.add(routed);
    }
    return set;
  }

  get visitedEdges() {
    const set = new Set();
    for (const row of this.args.trace || []) {
      const routed = row.graph_payload?.routed_to;
      if (routed) set.add(`${row.graph_node}→${routed}`);
    }
    return set;
  }

  // 'From→To' → first step number the edge was traversed (1-indexed).
  // Lets us label edges in traversal order so a reader can follow the
  // path even when loops fan out into multiple arrows.
  get visitedEdgeOrder() {
    const map = new Map();
    const trace = this.args.trace || [];
    trace.forEach((row, idx) => {
      const routed = row.graph_payload?.routed_to;
      if (!routed) return;
      const key = `${row.graph_node}→${routed}`;
      if (!map.has(key)) map.set(key, idx + 1);
    });
    return map;
  }

  get lastNode() {
    const trace = this.args.trace || [];
    if (!trace.length) return null;
    const last = trace[trace.length - 1];
    return last.graph_payload?.routed_to || last.graph_node;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    if (this._sim) {
      this._sim.stop();
      this._sim = null;
    }
  }

  @action
  zoomIn() {
    if (!this._svgSelection || !this._zoomBehavior) return;
    this._svgSelection.transition().call(this._zoomBehavior.scaleBy, 1.3);
  }

  @action
  zoomOut() {
    if (!this._svgSelection || !this._zoomBehavior) return;
    this._svgSelection.transition().call(this._zoomBehavior.scaleBy, 1 / 1.3);
  }

  @action
  zoomReset() {
    if (!this._svgSelection || !this._zoomBehavior) return;
    this._svgSelection
      .transition()
      .call(this._zoomBehavior.transform, zoomIdentity);
  }

  @action
  render(element) {
    this._svg = element;
    const structure = this.args.structure;
    if (!structure?.nodes?.length) return;

    const width = 800;
    const height = 560;
    const visitedNodes = this.visitedNodes;
    const visitedEdges = this.visitedEdges;
    const visitedEdgeOrder = this.visitedEdgeOrder;
    const lastNode = this.lastNode;
    const VISITED_EDGE_COLOR = '#ea580c'; // orange-600 — stands out from blue/green/red/gray groups

    // Force-sim wants mutable node/link objects; clone so we don't
    // poison @structure's identities (Ember Data records are frozen).
    const nodes = structure.nodes.map((n) => ({ ...n }));
    const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
    const links = (structure.edges || [])
      .map((e) => ({
        source: nodeIndex.get(e.from),
        target: nodeIndex.get(e.to),
        from: e.from,
        to: e.to,
      }))
      .filter((l) => l.source && l.target);

    const svg = select(element)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    svg.selectAll('*').remove();
    this._svgSelection = svg;

    const defs = svg.append('defs');

    // Zoomable container — wheel scrolls zoom, background drag pans.
    // Nodes still draggable because their drag handler stops event
    // propagation via .on('start', ...) applying d3-drag's own
    // gesture; zoomBehavior.filter() below also explicitly ignores
    // pointerdowns inside node groups so you can drag nodes without
    // the pan gesture stealing the event.
    const root = svg.append('g').attr('class', 'cc-zoom-root');
    const arrow = (id, color) => {
      defs
        .append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    };
    arrow('cc-arrow-unvisited', '#9ca3af');
    arrow('cc-arrow-visited', VISITED_EDGE_COLOR);

    const linkSel = root
      .append('g')
      .attr('class', 'cc-links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) =>
        visitedEdges.has(`${d.from}→${d.to}`) ? VISITED_EDGE_COLOR : '#d1d5db',
      )
      .attr('stroke-width', (d) =>
        visitedEdges.has(`${d.from}→${d.to}`) ? 3 : 1,
      )
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', (d) =>
        visitedEdges.has(`${d.from}→${d.to}`) ? null : '3,3',
      )
      .attr('marker-end', (d) =>
        visitedEdges.has(`${d.from}→${d.to}`)
          ? 'url(#cc-arrow-visited)'
          : 'url(#cc-arrow-unvisited)',
      );

    // Sequence badges on traversed edges — orange circle with step
    // number at the link midpoint. Lets a reader follow the path order.
    const visitedLinks = links.filter((l) =>
      visitedEdgeOrder.has(`${l.from}→${l.to}`),
    );
    const badgeSel = root
      .append('g')
      .attr('class', 'cc-edge-badges')
      .attr('pointer-events', 'none')
      .selectAll('g')
      .data(visitedLinks)
      .join('g');
    badgeSel
      .append('circle')
      .attr('r', 9)
      .attr('fill', VISITED_EDGE_COLOR)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);
    badgeSel
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('fill', '#ffffff')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .text((d) => visitedEdgeOrder.get(`${d.from}→${d.to}`));

    const nodeSel = root
      .append('g')
      .attr('class', 'cc-nodes')
      .selectAll('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('tabindex', 0)
      .attr('class', (d) => {
        const cls = ['cc-node', `cc-group-${d.group}`];
        if (visitedNodes.has(d.id)) cls.push('cc-visited');
        if (d.id === lastNode) cls.push('cc-last');
        return cls.join(' ');
      })
      .style('cursor', 'pointer')
      .on('click', (_event, d) => this.args.onNodeClick?.(d.id))
      .on('mouseenter', (_event, d) => (this.hoveredNode = d))
      .on('mouseleave', () => (this.hoveredNode = null))
      .call(
        drag()
          .on('start', (event, d) => {
            if (!event.active) this._sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) this._sim.alphaTarget(0);
            // Keep node pinned where user released it.
            d.fx = event.x;
            d.fy = event.y;
          }),
      );

    nodeSel
      .append('circle')
      .attr('r', 22)
      .attr('fill', (d) => {
        const [light, strong] = this._palette[d.group] || [
          '#e5e7eb',
          '#6b7280',
        ];
        return visitedNodes.has(d.id) ? strong : light;
      })
      .attr('stroke', (d) => {
        const [, strong] = this._palette[d.group] || [null, '#6b7280'];
        return strong;
      })
      .attr('stroke-width', (d) => (d.id === lastNode ? 3 : 1.5));

    nodeSel
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', 9)
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('fill', (d) => (visitedNodes.has(d.id) ? '#ffffff' : '#1f2937'))
      .attr('pointer-events', 'none')
      .text((d) => d.label);

    // Native SVG tooltip as v1. Good for keyboard/screen readers too.
    nodeSel.append('title').text((d) => `${d.label}\n\n${d.description || ''}`);

    this._zoomBehavior = zoom()
      .scaleExtent([0.3, 4])
      // Filter: allow wheel/dblclick/touch always; for pointer events,
      // only initiate pan when the target is the bare svg (not inside
      // a node group). Keeps node-drag separate from pan-drag.
      .filter((event) => {
        if (event.type === 'wheel' || event.type === 'dblclick') return true;
        if (event.type.startsWith('touch')) return true;
        // pointer/mouse drag on background only
        return event.target === element;
      })
      .on('zoom', (event) => {
        root.attr('transform', event.transform);
      });
    svg.call(this._zoomBehavior);

    this._sim = forceSimulation(nodes)
      .force(
        'link',
        forceLink(links)
          .id((d) => d.id)
          .distance(90)
          .strength(0.6),
      )
      .force('charge', forceManyBody().strength(-320))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide().radius(32))
      .on('tick', () => {
        linkSel
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y);
        nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
        badgeSel.attr(
          'transform',
          (d) =>
            `translate(${(d.source.x + d.target.x) / 2},${
              (d.source.y + d.target.y) / 2
            })`,
        );
      });
  }
}
