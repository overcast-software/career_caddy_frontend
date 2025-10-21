import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class PanelCardComponent extends Component {
  @tracked collapsed = false;

  constructor(owner, args) {
    super(owner, args);
    if ('startCollapsed' in (this.args ?? {})) {
      this.collapsed = !!this.args.startCollapsed;
    }
  }

  @action
  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }

  @action
  handleToolbarClick(event) {
    const button = event.target.closest('[data-dir]');
    if (!button) return;
    
    event.preventDefault();
    const dir = button.dataset.dir;
    this.triggerDirection(dir, event.currentTarget);
  }

  @action
  handleToolbarKeydown(event) {
    const keyMap = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right'
    };
    
    if (keyMap[event.key]) {
      event.preventDefault();
      this.triggerDirection(keyMap[event.key], event.currentTarget);
    }
  }

  @action
  triggerDirection(dir, anchorEl) {
    if (typeof this.args.onDirection === 'function') {
      this.args.onDirection(dir);
    }
    
    anchorEl.dispatchEvent(new CustomEvent('direction', { 
      detail: { dir }, 
      bubbles: true 
    }));
  }
}
