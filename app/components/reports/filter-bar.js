import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

const PRESETS = [
  { key: 'all', label: 'All time', days: null },
  { key: '30', label: '30d', days: 30 },
  { key: '90', label: '90d', days: 90 },
  { key: '1y', label: '1y', days: 365 },
];

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default class ReportsFilterBarComponent extends Component {
  @service api;

  @tracked options = { sources: [], users: [] };
  @tracked optionsLoaded = false;
  @tracked customOpen = false;

  get filters() {
    return this.args.filters || {};
  }

  get showPersonFilter() {
    return this.args.isStaff && this.args.scope === 'all';
  }

  get activePresetKey() {
    const { from, to } = this.filters;
    if (!from && !to) return 'all';
    for (const p of PRESETS) {
      if (!p.days) continue;
      if (from === isoDaysAgo(p.days) && !to) return p.key;
    }
    return 'custom';
  }

  get presets() {
    return PRESETS;
  }

  @action
  async loadOptions() {
    if (this.optionsLoaded) return;
    try {
      const resp = await fetch(`${this.api.baseUrl}reports/filter-options/`, {
        headers: this.api.headers(),
        cache: 'no-store',
      });
      if (resp.ok) {
        this.options = await resp.json();
      }
    } finally {
      this.optionsLoaded = true;
    }
  }

  @action
  setSource(event) {
    this.args.onChange?.({ source: event.target.value });
  }

  @action
  setUser(event) {
    this.args.onChange?.({ user: event.target.value });
  }

  @action
  setPreset(preset) {
    if (preset.key === 'custom') {
      this.customOpen = true;
      return;
    }
    this.customOpen = false;
    const from = preset.days ? isoDaysAgo(preset.days) : '';
    this.args.onChange?.({ from, to: '' });
  }

  @action
  setFrom(event) {
    this.args.onChange?.({ from: event.target.value });
  }

  @action
  setTo(event) {
    this.args.onChange?.({ to: event.target.value });
  }

  @action
  toggleExcludeStubs(event) {
    this.args.onChange?.({ exclude_stubs: event.target.checked ? '1' : '' });
  }
}
