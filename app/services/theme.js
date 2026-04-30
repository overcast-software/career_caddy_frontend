import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const PALETTES = ['indigo', 'blue', 'jade', 'rose', 'amber', 'violet'];
const DEFAULT_PALETTE = 'indigo';
const MODES = ['system', 'light', 'dark'];

export default class ThemeService extends Service {
  @tracked mode = 'system';
  @tracked palette = DEFAULT_PALETTE;
  @tracked _systemPrefersDark = false;
  _mediaQuery = null;

  get isDark() {
    if (this.mode === 'system') return this._systemPrefersDark;
    return this.mode === 'dark';
  }

  get palettes() {
    return PALETTES;
  }

  get modes() {
    return MODES;
  }

  constructor() {
    super(...arguments);
    this._migrateOldKey();
    const saved = localStorage.getItem('theme-mode');
    this.mode = MODES.includes(saved) ? saved : 'system';
    this.palette = localStorage.getItem('theme-palette') || DEFAULT_PALETTE;

    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._systemPrefersDark = this._mediaQuery.matches;
    this._mediaQuery.addEventListener('change', this._onSystemChange);

    this._apply();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    if (this._mediaQuery) {
      this._mediaQuery.removeEventListener('change', this._onSystemChange);
    }
  }

  _onSystemChange = (event) => {
    this._systemPrefersDark = event.matches;
    if (this.mode === 'system') this._apply();
  };

  @action
  setMode(mode) {
    if (!MODES.includes(mode)) return;
    this.mode = mode;
    localStorage.setItem('theme-mode', this.mode);
    this._apply();
  }

  @action
  toggle() {
    this.setMode(this.isDark ? 'light' : 'dark');
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
    el.dataset.theme = this.isDark ? 'dark' : '';
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
