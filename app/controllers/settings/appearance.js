import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

const SWATCH_COLORS = {
  indigo: ['#e0e7ff', '#a5b4fc', '#6366f1', '#4338ca', '#312e81'],
  blue: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'],
  jade: ['#d1fae5', '#6ee7b7', '#10b981', '#047857', '#064e3b'],
  rose: ['#ffe4e6', '#fda4af', '#f43f5e', '#be123c', '#881337'],
  amber: ['#fef3c7', '#fcd34d', '#f59e0b', '#b45309', '#78350f'],
  violet: ['#ede9fe', '#c4b5fd', '#8b5cf6', '#6d28d9', '#4c1d95'],
};

export default class SettingsAppearanceController extends Controller {
  @service theme;

  get paletteOptions() {
    return this.theme.palettes.map((id) => ({
      id,
      name: id,
      swatches: SWATCH_COLORS[id].map((c) => `background-color: ${c}`),
    }));
  }

  @action
  selectPalette(palette) {
    this.theme.setPalette(palette);
  }
}
