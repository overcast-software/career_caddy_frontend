import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { select } from 'd3-selection';
import 'd3-transition'; // side-effect: adds .transition() to d3-selection
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import {
  NODE_LABELS,
  NODE_COLORS,
  NODE_DESCRIPTIONS,
  NODE_LINK_PARAMS,
} from './colors';
import {
  DURATIONS,
  drawStroke,
  fadeOut,
} from 'career-caddy-frontend/utils/chart-animations';

// Sankey animation beats — each column takes one beat to show its nodes,
// then the next beat draws the links leaving it. Column N nodes appear at
// `N * COLUMN_MS`, links from column N start at `N * COLUMN_MS + NODE_FADE_MS`.
// This keeps a link's pen-tip visually "feeding into" its target node
// instead of drawing across an empty area to an already-visible node.
const NODE_FADE_MS = DURATIONS.fast;
const LINK_DRAW_MS = DURATIONS.medium;
const COLUMN_MS = NODE_FADE_MS + LINK_DRAW_MS;

const W = 720;
const H = 460;
// Labels sit adjacent to their nodes (left-half nodes flow their text
// rightward between the first and second columns; right-half nodes flow
// left between the last and second-to-last columns). The margins are
// mostly buffer — keeping them tight makes the sankey fill the card.
const MARGIN = { top: 16, right: 90, bottom: 16, left: 16 };
const TRANSITION_MS = 500;

export default class ApplicationFlowSankeyComponent extends Component {
  @service router;
  el = null;

  _goToNode(d) {
    const params = NODE_LINK_PARAMS[d.id];
    if (!params) return;
    this.router.transitionTo('job-posts.index', {
      queryParams: {
        search: null,
        hostname: null,
        stub: null,
        source: null,
        scored: null,
        bucket: null,
        ...params,
      },
    });
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
    const nodes = (this.args.nodes || []).map((n) => ({ ...n }));
    const links = (this.args.links || []).map((l) => ({ ...l }));
    const svg = select(this.el);
    if (!nodes.length || !links.length) {
      svg.selectAll('*').remove();
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

    const indexed = nodes.map((n, i) => ({ ...n, index: i }));
    const graph = layout({
      nodes: indexed,
      links: links.map((l) => ({ ...l })),
    });

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'w-full h-auto');

    // Persistent group containers — established once; data joins animate in
    // place on subsequent renders. Classic d3 enter/update/exit pattern.
    let linkG = svg.select('g.sankey-links');
    if (linkG.empty()) {
      linkG = svg
        .append('g')
        .attr('class', 'sankey-links')
        .attr('fill', 'none');
    }
    let nodeG = svg.select('g.sankey-nodes');
    if (nodeG.empty()) {
      nodeG = svg.append('g').attr('class', 'sankey-nodes');
    }

    const linkKey = (d) => `${d.source.id}->${d.target.id}`;
    const nodeKey = (d) => d.id;

    linkG
      .selectAll('path')
      .data(graph.links, linkKey)
      .join(
        (enter) => {
          const sel = enter
            .append('path')
            .attr('stroke', (d) => NODE_COLORS[d.target.id] || '#cbd5e1')
            .attr('stroke-opacity', 0.45)
            .attr('stroke-width', (d) => Math.max(1, d.width))
            .attr('fill', 'none')
            .attr('d', sankeyLinkHorizontal());
          // Draw each link in its column's beat: wait for the source
          // column's nodes to land, then fill the stroke over LINK_DRAW_MS.
          // Link finishes exactly when the target column's nodes begin
          // to appear — no visible gap between pen-tip and target rect.
          drawStroke(sel, {
            duration: LINK_DRAW_MS,
            delay: (d) => (d.source.depth || 0) * COLUMN_MS + NODE_FADE_MS,
          });
          return sel;
        },
        (update) =>
          update.call((s) =>
            s
              .transition()
              .duration(TRANSITION_MS)
              .attr('stroke', (d) => NODE_COLORS[d.target.id] || '#cbd5e1')
              .attr('stroke-width', (d) => Math.max(1, d.width))
              .attr('d', sankeyLinkHorizontal()),
          ),
        (exit) => fadeOut(exit),
      );

    const ng = nodeG
      .selectAll('g.node')
      .data(graph.nodes, nodeKey)
      .join(
        (enter) => {
          const self = this;
          const g = enter.append('g').attr('class', 'node');
          // Seed the rect collapsed to a zero-height line at its vertical
          // center, then grow to full height during the column's beat.
          // Looks like the hub is extruding into place rather than
          // popping in — same principle applied to every column.
          g.append('rect')
            .attr('x', (d) => d.x0)
            .attr('y', (d) => (d.y0 + d.y1) / 2)
            .attr('width', (d) => d.x1 - d.x0)
            .attr('height', 0);
          // Labels already sit at their final positions but start hidden
          // so they don't flash during the grow animation.
          g.append('text')
            .attr('class', 'value')
            .attr('x', (d) => (d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6))
            .attr('y', (d) => (d.y0 + d.y1) / 2 - 8)
            .attr('opacity', 0);
          g.append('text')
            .attr('class', 'name')
            .attr('x', (d) => (d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6))
            .attr('y', (d) => (d.y0 + d.y1) / 2 + 10)
            .attr('opacity', 0);
          g.append('title');
          g.attr('class', (d) =>
            NODE_LINK_PARAMS[d.id] ? 'node cursor-pointer' : 'node',
          )
            .attr('tabindex', (d) => (NODE_LINK_PARAMS[d.id] ? 0 : null))
            .attr('role', (d) => (NODE_LINK_PARAMS[d.id] ? 'link' : null))
            .on('click', (_event, d) => self._goToNode(d))
            .on('keydown', (event, d) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                self._goToNode(d);
              }
            });

          // Grow the rect top-and-bottom into its final height, synced
          // to the column beat.
          g.select('rect')
            .transition()
            .delay((d) => (d.depth || 0) * COLUMN_MS)
            .duration(NODE_FADE_MS)
            .attr('y', (d) => d.y0)
            .attr('height', (d) => Math.max(1, d.y1 - d.y0));
          // Labels fade in right after the rect lands so the text isn't
          // peeking through mid-grow.
          g.selectAll('text')
            .transition()
            .delay((d) => (d.depth || 0) * COLUMN_MS + NODE_FADE_MS)
            .duration(DURATIONS.fast)
            .attr('opacity', 1);
          return g;
        },
        (update) => {
          // On data change (scope toggle, filter change) the nodes are
          // already on-screen — slide them to their new positions over
          // TRANSITION_MS. Don't run the grow-from-center animation
          // again; these rects aren't new.
          update
            .select('rect')
            .transition()
            .duration(TRANSITION_MS)
            .attr('x', (d) => d.x0)
            .attr('y', (d) => d.y0)
            .attr('height', (d) => Math.max(1, d.y1 - d.y0))
            .attr('width', (d) => d.x1 - d.x0);
          update
            .select('text.value')
            .transition()
            .duration(TRANSITION_MS)
            .attr('x', (d) => (d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6))
            .attr('y', (d) => (d.y0 + d.y1) / 2 - 8);
          update
            .select('text.name')
            .transition()
            .duration(TRANSITION_MS)
            .attr('x', (d) => (d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6))
            .attr('y', (d) => (d.y0 + d.y1) / 2 + 10);
          return update;
        },
        (exit) => fadeOut(exit),
      );

    // Attrs that aren't animated — safe to set instantly on merged
    // selection (both enter + update) without interrupting transitions.
    ng.select('rect').attr('fill', (d) => NODE_COLORS[d.id] || '#64748b');

    ng.select('text.value')
      .attr('text-anchor', (d) => (d.x0 < W / 2 ? 'start' : 'end'))
      .attr('dominant-baseline', 'middle')
      .attr('class', 'value fill-gray-900 dark:fill-gray-100')
      .attr('font-size', 16)
      .attr('font-weight', 600)
      .text((d) => d.value || 0);

    ng.select('text.name')
      .attr('text-anchor', (d) => (d.x0 < W / 2 ? 'start' : 'end'))
      .attr('dominant-baseline', 'middle')
      .attr('class', 'name fill-gray-500 dark:fill-gray-400')
      .attr('font-size', 11)
      .text((d) => NODE_LABELS[d.id] || d.id);

    ng.select('title').text((d) => {
      const label = NODE_LABELS[d.id] || d.id;
      const desc = NODE_DESCRIPTIONS[d.id] || '';
      const drill = NODE_LINK_PARAMS[d.id]
        ? ' — click to view these job posts'
        : '';
      return desc ? `${label}: ${desc} (${d.value})${drill}` : label;
    });
  }
}
