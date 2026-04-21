// Split a chunk of markdown into h3-delimited sections. Content above the
// first h3 becomes a synthetic "Profile" section so the name/email/phone
// header still gets its own card + nav entry.
//
// Used by career-data's sectioned-view component and the anchor-nav widget;
// keeping the logic in one place guarantees both see the same section ids.
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function parseMarkdownSections(src) {
  if (!src || !String(src).trim()) return [];
  const lines = String(src).split('\n');
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
