import Component from '@glimmer/component';
import { parseMarkdownSections } from 'career-caddy-frontend/utils/markdown-sections';

export default class CareerDataSectionedViewComponent extends Component {
  get sections() {
    return parseMarkdownSections(this.args.markdown);
  }
}
