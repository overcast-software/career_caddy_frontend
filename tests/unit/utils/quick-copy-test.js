import { module, test } from 'qunit';
import {
  ICONS,
  inferIcon,
  normalizeItems,
  composeQuickCopyItems,
} from 'career-caddy-frontend/utils/quick-copy';

module('Unit | Utility | quick-copy', function () {
  test('ICONS is the shared vocabulary', function (assert) {
    assert.deepEqual(ICONS, ['linkedin', 'github', 'globe', 'text']);
  });

  test('inferIcon: globe for URLs, text for prose', function (assert) {
    assert.strictEqual(inferIcon('https://example.com'), 'globe');
    assert.strictEqual(inferIcon('http://example.com'), 'globe');
    assert.strictEqual(inferIcon('www.example.com'), 'globe');
    assert.strictEqual(inferIcon('My elevator pitch'), 'text');
    assert.strictEqual(inferIcon(''), 'text');
    assert.strictEqual(inferIcon(null), 'text');
  });

  test('normalizeItems tolerates non-arrays', function (assert) {
    assert.deepEqual(normalizeItems(null), []);
    assert.deepEqual(normalizeItems(undefined), []);
    assert.deepEqual(normalizeItems('nope'), []);
  });

  test('normalizeItems reads legacy {name,url} (url -> value) and infers icon', function (assert) {
    // Existing users have {name, url} snippets where url held the copy text.
    const out = normalizeItems([
      { name: 'Portfolio', url: 'https://me.dev' },
      { name: 'Pitch', url: 'I build reliable systems.' },
    ]);
    assert.deepEqual(out, [
      { name: 'Portfolio', value: 'https://me.dev', icon: 'globe', pinned: false },
      { name: 'Pitch', value: 'I build reliable systems.', icon: 'text', pinned: false },
    ]);
  });

  test('normalizeItems prefers value over legacy url and keeps a valid icon/pinned', function (assert) {
    const out = normalizeItems([
      { name: 'Site', value: 'https://new.dev', url: 'https://old.dev', icon: 'globe', pinned: true },
      { name: 'Weird', value: 'x', icon: 'bogus' },
    ]);
    assert.deepEqual(out[0], {
      name: 'Site',
      value: 'https://new.dev',
      icon: 'globe',
      pinned: true,
    });
    // A bogus icon is replaced by an inferred one.
    assert.strictEqual(out[1].icon, 'text');
    assert.false(out[1].pinned);
  });

  test('composeQuickCopyItems seeds LinkedIn + GitHub pinned then appends links', function (assert) {
    const user = {
      linkedin: 'https://linkedin.com/in/me',
      github: 'https://github.com/me',
      links: [{ name: 'Portfolio', url: 'https://me.dev' }],
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
    assert.strictEqual(items[2].icon, 'globe');
  });

  test('composeQuickCopyItems omits blank linkedin/github seeds', function (assert) {
    const items = composeQuickCopyItems({
      linkedin: '',
      github: '   ',
      links: [{ name: 'Pitch', value: 'hi', icon: 'text' }],
    });
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].name, 'Pitch');
  });

  test('composeQuickCopyItems drops links with a seeded linkedin/github icon (no double-up)', function (assert) {
    const items = composeQuickCopyItems({
      linkedin: 'https://linkedin.com/in/me',
      links: [
        { name: 'Old LinkedIn copy', value: 'https://linkedin.com/in/me', icon: 'linkedin' },
        { name: 'Blog', value: 'https://blog.dev', icon: 'globe' },
      ],
    });
    // LinkedIn seed + Blog only; the links-side linkedin item is skipped.
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].icon, 'linkedin');
    assert.strictEqual(items[1].name, 'Blog');
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
  });

  test('composeQuickCopyItems returns [] for a null user', function (assert) {
    assert.deepEqual(composeQuickCopyItems(null), []);
  });
});
