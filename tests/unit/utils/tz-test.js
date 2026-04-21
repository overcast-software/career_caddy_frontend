import { module, test } from 'qunit';
import {
  formatInstant,
  formatCalendarDate,
  toCalendarString,
  LOCAL_TZ,
} from 'career-caddy-frontend/utils/tz';

module('Unit | Utility | tz', function () {
  test('LOCAL_TZ is America/Los_Angeles', function (assert) {
    assert.strictEqual(LOCAL_TZ, 'America/Los_Angeles');
  });

  test('formatCalendarDate passes through calendar string without Date', function (assert) {
    // Regardless of browser TZ, a calendar date keeps its day.
    assert.strictEqual(
      formatCalendarDate('2024-01-15', 'MMM D, YYYY'),
      'Jan 15, 2024',
    );
    assert.strictEqual(formatCalendarDate('2024-06-30', 'MM.YYYY'), '06.2024');
  });

  test('formatCalendarDate returns empty on falsy / malformed', function (assert) {
    assert.strictEqual(formatCalendarDate(null), '');
    assert.strictEqual(formatCalendarDate(''), '');
    assert.strictEqual(formatCalendarDate('not-a-date'), '');
  });

  test('formatInstant renders a UTC instant in PST', function (assert) {
    // 2024-04-21 07:00 UTC = 2024-04-21 00:00 PDT (still Apr 21).
    assert.strictEqual(
      formatInstant('2024-04-21T07:00:00Z', 'MMM D, YYYY'),
      'Apr 21, 2024',
    );
    // 2024-04-21 06:00 UTC = 2024-04-20 23:00 PDT (previous day in PST).
    assert.strictEqual(
      formatInstant('2024-04-21T06:00:00Z', 'MMM D, YYYY'),
      'Apr 20, 2024',
    );
  });

  test('formatInstant handles Date objects and falsy values', function (assert) {
    assert.strictEqual(formatInstant(null), '');
    assert.strictEqual(formatInstant(undefined), '');
    assert.strictEqual(formatInstant(''), '');
    const d = new Date('2024-04-21T07:00:00Z');
    assert.strictEqual(formatInstant(d, 'YYYY-MM-DD'), '2024-04-21');
  });

  test('toCalendarString slices strings and reads local date from Date objects', function (assert) {
    assert.strictEqual(toCalendarString('2024-01-15'), '2024-01-15');
    assert.strictEqual(toCalendarString('2024-01-15T00:00:00Z'), '2024-01-15');
    assert.strictEqual(toCalendarString(null), '');
    assert.strictEqual(toCalendarString(''), '');
    // Local-midnight Date — uses local date parts (no UTC shift).
    const d = new Date(2024, 0, 15); // Jan 15 local
    assert.strictEqual(toCalendarString(d), '2024-01-15');
  });
});
