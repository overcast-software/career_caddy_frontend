import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ChatMessageComponent extends Component {
  @service router;

  @action
  handleClick(event) {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;

    event.preventDefault();
    const path = href.startsWith('/') ? href : `/${href}`;
    this.router.transitionTo(path);
  }
}
