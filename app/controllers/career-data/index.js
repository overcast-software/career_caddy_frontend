import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

function truncate(s, n = 42) {
  const t = String(s || '').trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trimEnd() + '…';
}

// Build stable anchor ids + human labels for the subnav anchor-nav.
// Resume → resume title; Q&A → truncated question; Cover Letter →
// company / job (falls back to a positional index when the item has
// no useful label field).
function entriesForSection(section) {
  const out = [];
  const items = section.items || [];
  items.forEach((item, idx) => {
    if (section.type === 'resumes') {
      out.push({
        id: `resume-${item.id}`,
        label: item.title || `Resume #${idx + 1}`,
      });
    } else if (section.type === 'qas') {
      out.push({
        id: `qa-${item.id}`,
        label: truncate(item.question) || `Q&A #${idx + 1}`,
      });
    } else if (section.type === 'cover_letters') {
      const base =
        item.company ||
        item.job ||
        (item.created_at ? item.created_at.slice(0, 10) : '');
      out.push({
        id: `cl-${item.id}`,
        label: base ? `Cover · ${base}` : `Cover Letter #${idx + 1}`,
      });
    }
  });
  return out;
}

export default class CareerDataIndexController extends Controller {
  @service flashMessages;
  @tracked copied = false;

  get sections() {
    return this.model?.sections || [];
  }

  // Flat list of nav targets (one per sub-card). The anchor-nav widget
  // observes these ids and shows the matching label as you scroll.
  get navEntries() {
    return this.sections.flatMap(entriesForSection);
  }

  @action
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 1500);
    } catch (err) {
      this.flashMessages.danger('Failed to copy to clipboard.');
      console.error('Failed to copy:', err);
    }
  }
}
