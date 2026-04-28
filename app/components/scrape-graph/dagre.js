import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { select } from 'd3-selection';
import { line as d3line, curveBasis } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import dagre from '@dagrejs/dagre';

/**
 * dagre-laid-out rendering of the scrape-graph.
 *
 * The previous force-directed layout fought the inherent flow of the
 * state machine — every edge was a tug-of-war and the chain came out
 * stringy. dagre arranges nodes by topological rank (top→bottom by
 * default) so the read order matches the run order, and self-loops
 * draw as proper arcs instead of overlapping straight lines.
 *
 * Args:
 *   @structure   — { nodes: [{id, group, label, description}], edges: [{from, to}] }
 *   @trace       — ordered transitions for the current scrape; [] for
 *                  the admin overview. Each entry has graph_node and
 *                  graph_payload.routed_to.
 *   @aggregate   — (optional) per-edge traffic from /graph-aggregate/:
 *                  [{from, to, count, success_rate}]. When present,
 *                  edge thickness ∝ count and color ∝ success_rate.
 *                  Visited highlights (per-scrape) take precedence.
 *   @onNodeClick — (optional) called with the node id on click.
 */
export default class ScrapeGraphDagre extends Component {
  @tracked hoveredNode = null;

  _svg = null;
  _svgSelection = null;
  _zoomBehavior = null;

  _palette = {
    scrape: ['#dbeafe', '#3b82f6'],
    obstacle: ['#fee2e2', '#ef4444'],
    extract: ['#dcfce7', '#22c55e'],
    terminal: ['#e5e7eb', '#6b7280'],
  };

  get visitedNodes() {
    const set = new Set();
    for (const row of this.args.trace || []) {
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

  get visitedEdgeOrder() {
    const map = new Map();
    (this.args.trace || []).forEach((row, idx) => {
      const routed = row.graph_payload?.routed_to;
      if (!routed) return;
      const key = `${row.graph_node}→${routed}`;
      if (!map.has(key)) map.set(key, idx + 1);
    });
    return map;
  }

  // 'From→To' → {count, success_rate} from /graph-aggregate/. Empty
  // map when the admin route didn't pass @aggregate (e.g. per-scrape
  // /scrapes/:id/graph view, where aggregate doesn't apply).
  get aggregateByEdge() {
    const map = new Map();
    for (const row of this.args.aggregate || []) {
      map.set(`${row.from}→${row.to}`, row);
    }
    return map;
  }

  get lastNode() {
    const trace = this.args.trace || [];
    if (!trace.length) return null;
    const last = trace[trace.length - 1];
    return last.graph_payload?.routed_to || last.graph_node;
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

    const visitedNodes = this.visitedNodes;
    const visitedEdges = this.visitedEdges;
    const visitedEdgeOrder = this.visitedEdgeOrder;
    const aggregateByEdge = this.aggregateByEdge;
    const lastNode = this.lastNode;
    const VISITED_EDGE_COLOR = '#ea580c'; // orange-600

    // ---- dagre layout ----
    const NODE_W = 110;
    const NODE_H = 44;
    const g = new dagre.graphlib.Graph({ multigraph: false });
    g.setGraph({
      rankdir: 'TB',
      nodesep: 26,
      ranksep: 56,
      marginx: 20,
      marginy: 20,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const n of structure.nodes) {
      g.setNode(n.id, { width: NODE_W, height: NODE_H, ...n });
    }
    for (const e of structure.edges || []) {
      if (g.hasNode(e.from) && g.hasNode(e.to)) {
        g.setEdge(e.from, e.to, { from: e.from, to: e.to });
      }
    }
    dagre.layout(g);
    const { width: graphW, height: graphH } = g.graph();

    const svg = select(element)
      .attr('viewBox', `0 0 ${graphW} ${graphH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    svg.selectAll('*').remove();
    this._svgSelection = svg;

    const defs = svg.append('defs');
    const root = svg.append('g').attr('class', 'cc-zoom-root');

    const arrow = (id, color) => {
      defs
        .append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 9)
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
    arrow('cc-arrow-aggregate', '#475569'); // slate-600 for aggregate-driven edges

    // ---- edges ----
    // Aggregate-driven thickness + color when @aggregate is supplied.
    const useAggregate = aggregateByEdge.size > 0;
    let countToWidth = null;
    let rateToColor = null;
    if (useAggregate) {
      const counts = Array.from(aggregateByEdge.values()).map((e) => e.count);
      const maxCount = Math.max(1, ...counts);
      countToWidth = scaleLinear()
        .domain([0, maxCount])
        .range([1, 6])
        .clamp(true);
      // 0.0 → red, 0.5 → amber, 1.0 → emerald
      rateToColor = scaleLinear()
        .domain([0, 0.5, 1])
        .range(['#ef4444', '#f59e0b', '#10b981'])
        .clamp(true);
    }

    const lineGen = d3line()
      .x((p) => p.x)
      .y((p) => p.y)
      .curve(curveBasis);

    const edgeData = g.edges().map((eid) => {
      const e = g.edge(eid);
      const key = `${eid.v}→${eid.w}`;
      const visited = visitedEdges.has(key);
      const aggRow = aggregateByEdge.get(key);
      let stroke = '#d1d5db';
      let strokeWidth = 1;
      let dasharray = '3,3';
      let marker = 'url(#cc-arrow-unvisited)';
      if (visited) {
        stroke = VISITED_EDGE_COLOR;
        strokeWidth = 3;
        dasharray = null;
        marker = 'url(#cc-arrow-visited)';
      } else if (aggRow) {
        stroke = rateToColor(aggRow.success_rate ?? 0);
        strokeWidth = countToWidth(aggRow.count);
        dasharray = null;
        marker = 'url(#cc-arrow-aggregate)';
      }
      return {
        key,
        from: eid.v,
        to: eid.w,
        path: lineGen(e.points),
        stroke,
        strokeWidth,
        dasharray,
        marker,
        midpoint: e.points[Math.floor(e.points.length / 2)],
        aggRow,
      };
    });

    const linkSel = root
      .append('g')
      .attr('class', 'cc-links')
      .attr('fill', 'none')
      .selectAll('path')
      .data(edgeData)
      .join('path')
      .attr('d', (d) => d.path)
      .attr('stroke', (d) => d.stroke)
      .attr('stroke-width', (d) => d.strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', (d) => d.dasharray)
      .attr('marker-end', (d) => d.marker);
    linkSel
      .append('title')
      .text((d) =>
        d.aggRow
          ? `${d.from} → ${d.to}\ncount=${d.aggRow.count}  success=${(
              (d.aggRow.success_rate ?? 0) * 100
            ).toFixed(0)}%`
          : `${d.from} → ${d.to}`,
      );

    // Per-scrape step badges on visited edges (1-indexed traversal order).
    const visitedLinks = edgeData.filter((d) => visitedEdgeOrder.has(d.key));
    const badgeSel = root
      .append('g')
      .attr('class', 'cc-edge-badges')
      .attr('pointer-events', 'none')
      .selectAll('g')
      .data(visitedLinks)
      .join('g')
      .attr('transform', (d) => `translate(${d.midpoint.x},${d.midpoint.y})`);
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
      .text((d) => visitedEdgeOrder.get(d.key));

    // Aggregate count labels (only when not also visited — the step
    // badge would collide). Small, muted, set above the midpoint.
    if (useAggregate) {
      const aggLabels = edgeData.filter(
        (d) => d.aggRow && !visitedEdgeOrder.has(d.key),
      );
      root
        .append('g')
        .attr('class', 'cc-edge-counts')
        .attr('pointer-events', 'none')
        .selectAll('text')
        .data(aggLabels)
        .join('text')
        .attr('x', (d) => d.midpoint.x)
        .attr('y', (d) => d.midpoint.y - 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('font-weight', 600)
        .attr('fill', '#475569')
        .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
        .text((d) => d.aggRow.count);
    }

    // ---- nodes ----
    const nodeData = g.nodes().map((id) => {
      const n = g.node(id);
      return { ...n, id };
    });
    const nodeSel = root
      .append('g')
      .attr('class', 'cc-nodes')
      .selectAll('g')
      .data(nodeData, (d) => d.id)
      .join('g')
      .attr('tabindex', 0)
      .attr('class', (d) => {
        const cls = ['cc-node', `cc-group-${d.group}`];
        if (visitedNodes.has(d.id)) cls.push('cc-visited');
        if (d.id === lastNode) cls.push('cc-last');
        return cls.join(' ');
      })
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => this.args.onNodeClick?.(d.id))
      .on('mouseenter', (_event, d) => (this.hoveredNode = d))
      .on('mouseleave', () => (this.hoveredNode = null));

    nodeSel
      .append('rect')
      .attr('x', -NODE_W / 2)
      .attr('y', -NODE_H / 2)
      .attr('width', NODE_W)
      .attr('height', NODE_H)
      .attr('rx', 8)
      .attr('ry', 8)
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
      .attr('stroke-width', (d) => (d.id === lastNode ? 2.5 : 1.25));

    nodeSel
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', 10)
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('fill', (d) => (visitedNodes.has(d.id) ? '#ffffff' : '#1f2937'))
      .attr('pointer-events', 'none')
      .text((d) => d.label);

    nodeSel.append('title').text((d) => `${d.label}\n\n${d.description || ''}`);

    // ---- zoom / pan ----
    this._zoomBehavior = zoom()
      .scaleExtent([0.3, 4])
      .filter((event) => {
        if (event.type === 'wheel' || event.type === 'dblclick') return true;
        if (event.type.startsWith('touch')) return true;
        return event.target === element;
      })
      .on('zoom', (event) => {
        root.attr('transform', event.transform);
      });
    svg.call(this._zoomBehavior);
  }
}
