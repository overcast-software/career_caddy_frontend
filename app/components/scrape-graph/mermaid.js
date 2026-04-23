import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

/**
 * Renders a mermaid source block to SVG. Loads mermaid lazily on
 * first render so the admin bundle isn't bloated for users who
 * never open this route.
 *
 * @source  — mermaid source string (e.g. "stateDiagram-v2\n...").
 */
export default class ScrapeGraphMermaid extends Component {
  @tracked rendered = null;
  @tracked error = null;
  _counter = 0;

  @action
  async render(element) {
    if (!this.args.source) {
      this.rendered = '';
      return;
    }
    try {
      // Lazy-import keeps the main bundle thin.
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
      this._counter += 1;
      const id = `cc-scrape-graph-${Date.now()}-${this._counter}`;
      const { svg } = await mermaid.render(id, this.args.source);
      this.rendered = svg;
      if (element) {
        element.innerHTML = svg;
      }
    } catch (err) {
      this.error = err?.message || 'mermaid render failed';
    }
  }
}
