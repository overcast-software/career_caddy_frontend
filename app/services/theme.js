import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ThemeService extends Service {
  @tracked current = 'light';

  constructor() {
    super(...arguments);
    this.current = localStorage.getItem('theme') || 'light';
    this._applyTheme(this.current);
  }

  get isDark() {
    return this.current === 'dark';
  }

  @action
  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.current);
    this._applyTheme(this.current);
  }

  _applyTheme(theme) {
    document.documentElement.dataset.theme = theme === 'light' ? '' : theme;
  }
}
