import { module, test } from 'qunit';
import {
  ICONS,
  BRAND_ICONS,
  CUSTOM_ICONS,
  ICON_EMOJI,
  DEFAULT_CUSTOM_ICON,
  normalizeCustomIcon,
  inferIcon,
  normalizeItems,
  composeQuickCopyItems,
} from 'career-caddy-frontend/utils/quick-copy';

module('Unit | Utility | quick-copy', function () {
  test('the hybrid icon vocabulary', function (assert) {
    assert.deepEqual(BRAND_ICONS, ['linkedin', 'github'], 'brand keys (seeds)');
    assert.deepEqual(
      CUSTOM_ICONS,
      ['flag', 'golfer', 'trophy', 'target', 'finish'],
      'golf keys (custom items)',
    );
    assert.deepEqual(
      ICONS,
      ['linkedin', 'github', 'flag', 'golfer', 'trophy', 'target', 'finish'],
      'ICONS is brand + golf',
    );
    assert.strictEqual(DEFAULT_CUSTOM_ICON, 'flag', 'new custom item defaults to flag');
    assert.strictEqual(ICON_EMOJI.flag, '⛳');
    assert.strictEqual(ICON_EMOJI.golfer, '🏌️');
    assert.strictEqual(ICON_EMOJI.trophy, '🏆');
    assert.strictEqual(ICON_EMOJI.target, '🎯');
    assert.strictEqual(ICON_EMOJI.finish, '🏁');
  });

  test('normalizeCustomIcon: valid golf keys pass, legacy maps, junk defaults', function (assert) {
    // Valid golf keys pass through.
    for (const key of CUSTOM_ICONS) {
      assert.strictEqual(normalizeCustomIcon(key), key, `${key} passes through`);
    }
    // Legacy pre-hybrid values map to golf keys.
    assert.strictEqual(normalizeCustomIcon('globe'), 'flag', 'globe -> flag');
    assert.strictEqual(normalizeCustomIcon('text'), 'golfer', 'text -> golfer');
    // A stale brand key on a custom item, junk, or missing → default.
    assert.strictEqual(normalizeCustomIcon('linkedin'), 'flag');
    assert.strictEqual(normalizeCustomIcon('bogus'), 'flag');
    assert.strictEqual(normalizeCustomIcon(undefined), 'flag');
    assert.strictEqual(normalizeCustomIcon(null), 'flag');
  });

  test('inferIcon aliases normalizeCustomIcon (legacy -> golf)', function (assert) {
    assert.strictEqual(inferIcon('globe'), 'flag');
    assert.strictEqual(inferIcon('text'), 'golfer');
    assert.strictEqual(inferIcon('trophy'), 'trophy');
    assert.strictEqual(inferIcon(undefined), 'flag');
  });

  test('normalizeItems tolerates non-arrays', function (assert) {
    assert.deepEqual(normalizeItems(null), []);
    assert.deepEqual(normalizeItems(undefined), []);
    assert.deepEqual(normalizeItems('nope'), []);
  });

  test('normalizeItems reads legacy {name,url} (url -> value) and maps legacy icons to golf', function (assert) {
    // Existing users: {name, url} snippets, and old globe/text icon values.
    const out = normalizeItems([
      { name: 'Portfolio', url: 'https://me.dev', icon: 'globe' },
      { name: 'Pitch', url: 'I build reliable systems.', icon: 'text' },
      { name: 'Bare', url: 'no-icon-field' },
    ]);
    assert.deepEqual(out, [
      { name: 'Portfolio', value: 'https://me.dev', icon: 'flag', pinned: false },
      {
        name: 'Pitch',
        value: 'I build reliable systems.',
        icon: 'golfer',
        pinned: false,
      },
      // A missing icon defaults to flag.
      { name: 'Bare', value: 'no-icon-field', icon: 'flag', pinned: false },
    ]);
  });

  test('normalizeItems prefers value over legacy url and keeps a valid golf icon/pinned', function (assert) {
    const out = normalizeItems([
      {
        name: 'Site',
        value: 'https://new.dev',
        url: 'https://old.dev',
        icon: 'target',
        pinned: true,
      },
      { name: 'Weird', value: 'x', icon: 'bogus' },
    ]);
    assert.deepEqual(out[0], {
      name: 'Site',
      value: 'https://new.dev',
      icon: 'target',
      pinned: true,
    });
    // A bogus icon falls back to the golf default.
    assert.strictEqual(out[1].icon, 'flag');
    assert.false(out[1].pinned);
  });

  test('composeQuickCopyItems seeds LinkedIn + GitHub (brand) then appends golf-iconed links', function (assert) {
    const user = {
      linkedin: 'https://linkedin.com/in/me',
      github: 'https://github.com/me',
      links: [{ name: 'Portfolio', url: 'https://me.dev', icon: 'globe' }],
    };
    const items = composeQuickCopyItems(user);
    assert.strictEqual(items.length, 3);
    assert.deepEqual(items[0], {
      name: 'LinkedIn',
      value: 'https://linkedin.com/in/me',
      icon: 'linkedin',
      pinned: true,
    });
    assert.deepEqual(items[1], {
      name: 'GitHub',
      value: 'https://github.com/me',
      icon: 'github',
      pinned: true,
    });
    assert.strictEqual(items[2].name, 'Portfolio');
    // Legacy globe icon maps to the golf flag.
    assert.strictEqual(items[2].icon, 'flag');
  });

  test('composeQuickCopyItems omits blank linkedin/github seeds', function (assert) {
    const items = composeQuickCopyItems({
      linkedin: '',
      github: '   ',
      links: [{ name: 'Pitch', value: 'hi', icon: 'golfer' }],
    });
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].name, 'Pitch');
    assert.strictEqual(items[0].icon, 'golfer');
  });

  test('composeQuickCopyItems drops links carrying a brand icon (no double-up)', function (assert) {
    const items = composeQuickCopyItems({
      linkedin: 'https://linkedin.com/in/me',
      links: [
        {
          name: 'Old LinkedIn copy',
          value: 'https://linkedin.com/in/me',
          icon: 'linkedin',
        },
        { name: 'Blog', value: 'https://blog.dev', icon: 'trophy' },
      ],
    });
    // LinkedIn seed + Blog only; the links-side brand-iconed item is skipped.
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].icon, 'linkedin');
    assert.strictEqual(items[1].name, 'Blog');
    assert.strictEqual(items[1].icon, 'trophy');
  });

  test('composeQuickCopyItems drops empty-value link items', function (assert) {
    const items = composeQuickCopyItems({
      links: [
        { name: 'Empty', value: '' },
        { name: 'Real', value: 'copy me' },
      ],
    });
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].name, 'Real');
    assert.strictEqual(items[0].icon, 'flag', 'a value-only item defaults to flag');
  });

  test('composeQuickCopyItems returns [] for a null user', function (assert) {
    assert.deepEqual(composeQuickCopyItems(null), []);
  });
});
