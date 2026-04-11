import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const PALETTES = ['indigo', 'blue', 'jade', 'rose', 'amber', 'violet'];
const DEFAULT_PALETTE = 'indigo';

export default class ThemeService extends Service {
  @tracked mode = 'light';
  @tracked palette = DEFAULT_PALETTE;

  get isDark() {
    return this.mode === 'dark';
  }

  get palettes() {
    return PALETTES;
  }

  constructor() {
    super(...arguments);
    this._migrateOldKey();
    this.mode = localStorage.getItem('theme-mode') || 'light';
    this.palette = localStorage.getItem('theme-palette') || DEFAULT_PALETTE;
    this._apply();
  }

  @action
  toggle() {
    this.mode = this.mode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme-mode', this.mode);
    this._apply();
  }

  @action
  setPalette(palette) {
    if (!PALETTES.includes(palette)) return;
    this.palette = palette;
    localStorage.setItem('theme-palette', this.palette);
    this._apply();
  }

  _apply() {
    const el = document.documentElement;
    el.dataset.theme = this.mode === 'dark' ? 'dark' : '';
    el.dataset.palette = this.palette === DEFAULT_PALETTE ? '' : this.palette;
  }

  _migrateOldKey() {
    const old = localStorage.getItem('theme');
    if (old && !localStorage.getItem('theme-mode')) {
      if (old === 'jade') {
        localStorage.setItem('theme-mode', 'light');
        localStorage.setItem('theme-palette', 'jade');
      } else if (old === 'dark') {
        localStorage.setItem('theme-mode', 'dark');
        localStorage.setItem('theme-palette', DEFAULT_PALETTE);
      } else {
        localStorage.setItem('theme-mode', 'light');
        localStorage.setItem('theme-palette', DEFAULT_PALETTE);
      }
      localStorage.removeItem('theme');
    }
  }
}
