import Component from '@glimmer/component';

// Parse the markdown career-data blob into {title, id, body} sections so we
// can wrap each in its own card + offer a side-rail jump nav. Sections are
// h3 (###) headings in the resume template; the stuff above the first h3
// (name/title/email/phone, i.e. ## lines) becomes a synthetic "Profile"
// card at the top.
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export default class CareerDataSectionedViewComponent extends Component {
  get sections() {
    const src = this.args.markdown || '';
    if (!src.trim()) return [];

    // Split on lines that start with exactly three hashes + space. The chunk
    // before the first match is the header block.
    const lines = src.split('\n');
    const buckets = [];
    let current = { title: 'Profile', body: [] };
    for (const line of lines) {
      const m = /^###\s+(.+?)\s*$/.exec(line);
      if (m) {
        if (current.body.length || current.title !== 'Profile') {
          buckets.push(current);
        }
        current = { title: m[1], body: [] };
      } else {
        current.body.push(line);
      }
    }
    if (current.body.length || current.title !== 'Profile') {
      buckets.push(current);
    }

    return buckets.map((b, i) => ({
      id: `section-${slugify(b.title) || 'part-' + i}`,
      title: b.title,
      body: b.body.join('\n').trim(),
    }));
  }
}
