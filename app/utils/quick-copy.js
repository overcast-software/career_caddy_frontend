// CCEXT-18 — the shared quick-copy item contract. A quick-copy item is
// `{ name, value, icon, pinned }`:
//   name   — the label shown on the button
//   value  — the text copied to the clipboard
//   icon   — a semantic KEY (see the vocab below); drives the glyph on the web,
//            the settings manager, and the extension. Brand keys render a
//            recognizable SVG mark; golf keys render a native COLOR emoji.
//   pinned — LinkedIn/GitHub are seeded pinned so they sort first
//
// `Profile.links` stores the arbitrary items (portfolio, prompts, extra links);
// LinkedIn/GitHub stay canonical on their dedicated fields and are SEEDED into
// the list, not migrated. LinkedIn/GitHub edits mirror back to those fields on
// save. No api change, no migration — the serializer round-trips whatever JSON
// is in `links`.
//
// Icon vocab (hybrid — Doug's CCEXT-18 review):
//   BRAND (seeds only): linkedin, github  → SVG brand marks
//   GOLF (custom items): flag ⛳, golfer 🏌️, trophy 🏆, target 🎯, finish 🏁
//     → native color emoji, picked per item; default for a new custom item = flag
//
// Back-compat: existing snippets are `{ name, url }` where `url` held the copy
// text → read `url` as a fallback for `value`. Old icon values map to a golf
// default so nothing looks broken: globe → flag, text → golfer.

// Brand keys — seeds only, rendered as SVG marks.
export const BRAND_ICONS = ['linkedin', 'github'];

// Golf keys — the per-item picker for custom items, rendered as color emoji.
export const CUSTOM_ICONS = ['flag', 'golfer', 'trophy', 'target', 'finish'];

// The full vocabulary (brand + golf).
export const ICONS = [...BRAND_ICONS, ...CUSTOM_ICONS];

// Semantic key → emoji glyph (golf items only; brand marks are SVG).
export const ICON_EMOJI = {
  flag: '⛳',
  golfer: '🏌️',
  trophy: '🏆',
  target: '🎯',
  finish: '🏁',
};

// Default golf icon for a brand-new custom item.
export const DEFAULT_CUSTOM_ICON = 'flag';

// Legacy icon values → golf keys, so pre-hybrid items don't render blank.
const LEGACY_ICON_MAP = { globe: 'flag', text: 'golfer' };

// Coerce any stored icon value into a valid CUSTOM (golf) key for a custom
// item. Valid golf keys pass through; legacy globe/text map per LEGACY_ICON_MAP;
// anything else (missing, a stale brand key on a custom row, junk) falls back to
// the default. Custom items never carry a brand icon — brand keys belong to the
// seeded LinkedIn/GitHub rows only.
export function normalizeCustomIcon(icon) {
  if (CUSTOM_ICONS.includes(icon)) return icon;
  if (LEGACY_ICON_MAP[icon]) return LEGACY_ICON_MAP[icon];
  return DEFAULT_CUSTOM_ICON;
}

// Back-compat helper kept for callers/tests that ask "what icon should a
// legacy item get?" — a custom item's icon is always a golf key now.
export function inferIcon(icon) {
  return normalizeCustomIcon(icon);
}

// Normalize the raw `Profile.links` array into the item contract. Tolerant of
// the legacy `{ name, url }` shape (url → value) and of legacy/blank icon
// values (mapped to a golf key). Returns a fresh plain array of fresh plain
// objects (safe to feed to tracked state and to reorder via up/down move
// buttons without touching the model attr).
export function normalizeItems(links) {
  const list = Array.isArray(links) ? links : [];
  const items = [];
  for (const raw of list) {
    if (!raw) continue;
    const name = (raw.name ?? '').toString();
    // `value` is canonical; fall back to the legacy `url` field.
    const value = (raw.value ?? raw.url ?? '').toString();
    // Custom items always carry a golf key (legacy/brand/blank → golf default).
    const icon = normalizeCustomIcon(raw.icon);
    const pinned = Boolean(raw.pinned);
    items.push({ name, value, icon, pinned });
  }
  return items;
}

// Compose the full ordered quick-copy list from a user: LinkedIn + GitHub
// (seeded, pinned, brand marks) followed by the normalized `links` items (golf
// icons). This is the single source of truth reused by the sidebar, the
// settings manager, the read views, and (ported verbatim) the extension.
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
  const rawLinks = Array.isArray(user.links) ? user.links : [];
  for (const raw of rawLinks) {
    if (!raw) continue;
    // Skip any links item that carries a brand icon — LinkedIn/GitHub come from
    // the dedicated fields, so a stored brand-iconed link would double up.
    if (BRAND_ICONS.includes(raw.icon)) continue;
    const [item] = normalizeItems([raw]);
    if (!item || !item.value) continue;
    items.push(item);
  }
  return items;
}
