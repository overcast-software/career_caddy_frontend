// CCEXT-18 — the shared quick-copy item contract. A quick-copy item is
// `{ name, value, icon, pinned }`:
//   name   — the label shown on the button
//   value  — the text copied to the clipboard
//   icon   — one of ICONS below; drives the glyph on both the web and the
//            extension (the extension ports this same vocabulary as inline SVG)
//   pinned — LinkedIn/GitHub are seeded pinned so they sort first
//
// `Profile.links` stores the arbitrary items (portfolio, prompts, extra links);
// LinkedIn/GitHub stay canonical on their dedicated fields and are SEEDED into
// the list, not migrated. LinkedIn/GitHub edits mirror back to those fields on
// save. No api change, no migration — the serializer round-trips whatever JSON
// is in `links`.
//
// Back-compat: existing snippets are `{ name, url }` where `url` held the copy
// text. `normalizeItems` reads `url` as a fallback for `value` and infers a
// missing `icon` so nothing disappears from an existing user's list.

export const ICONS = ['linkedin', 'github', 'globe', 'text'];

const URL_RE = /^(https?:\/\/|www\.)/i;

// Infer an icon for an item that predates the `icon` field. A value that looks
// like a URL gets `globe`; everything else is prose → `text`.
export function inferIcon(value) {
  const v = (value ?? '').toString().trim();
  return URL_RE.test(v) ? 'globe' : 'text';
}

// Normalize the raw `Profile.links` array into the item contract. Tolerant of
// the legacy `{ name, url }` shape (url → value) and of a missing/blank icon.
// Returns a fresh plain array of fresh plain objects (safe to feed to tracked
// state and to mutate for drag-to-order without touching the model attr).
export function normalizeItems(links) {
  const list = Array.isArray(links) ? links : [];
  const items = [];
  for (const raw of list) {
    if (!raw) continue;
    const name = (raw.name ?? '').toString();
    // `value` is canonical; fall back to the legacy `url` field.
    const value = (raw.value ?? raw.url ?? '').toString();
    const icon = ICONS.includes(raw.icon) ? raw.icon : inferIcon(value);
    const pinned = Boolean(raw.pinned);
    items.push({ name, value, icon, pinned });
  }
  return items;
}

// Compose the full ordered quick-copy list from a user: LinkedIn + GitHub
// (seeded, pinned) followed by the normalized `links` items. This is the single
// source of truth reused by the sidebar, the read view, and (ported verbatim)
// the extension. `links` items that are themselves LinkedIn/GitHub seeds are
// dropped so the dedicated fields don't double up.
export function composeQuickCopyItems(user) {
  if (!user) return [];
  const items = [];
  const linkedin = (user.linkedin ?? '').toString().trim();
  const github = (user.github ?? '').toString().trim();
  if (linkedin) {
    items.push({
      name: 'LinkedIn',
      value: linkedin,
      icon: 'linkedin',
      pinned: true,
    });
  }
  if (github) {
    items.push({ name: 'GitHub', value: github, icon: 'github', pinned: true });
  }
  for (const item of normalizeItems(user.links)) {
    // Skip seeded linkedin/github icons so they don't render twice when a
    // user's saved list already carries them (the editor seeds them from the
    // dedicated fields, not from `links`).
    if (item.icon === 'linkedin' || item.icon === 'github') continue;
    if (!item.value) continue;
    items.push(item);
  }
  return items;
}
