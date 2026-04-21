// Timezone policy (see ~/.claude/plans/tranquil-enchanting-puzzle.md):
//   - Storage + wire are UTC for datetimes ("instants") and naïve calendar
//     strings "YYYY-MM-DD" for date-only fields.
//   - UI formats instants in PST. Calendar strings are NEVER wrapped in a
//     Date object — they're opaque strings (no TZ semantics).
//
// Single region today; hardcoded. Flip to a per-user preference when
// multi-tenant needs it.
import moment from 'moment';

export const LOCAL_TZ = 'America/Los_Angeles';

// Format an instant (ISO datetime from API, or Date) in LOCAL_TZ.
// We shift to PST wall-clock via Intl.DateTimeFormat (ships in every modern
// browser; no moment-timezone dep), then hand a naïve-local string to moment
// so its format tokens (MMM D YYYY, MM.YYYY, etc.) produce PST-labelled
// output. Tokens stay compatible with every existing caller.
export function formatInstant(value, fmt = 'MMM D, YYYY') {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LOCAL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '00';
  // "24" appears for midnight in some runtimes — coerce to "00".
  const hour = get('hour') === '24' ? '00' : get('hour');
  return moment(
    `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}`,
  ).format(fmt);
}

// Format a calendar string "YYYY-MM-DD" — no Date, no TZ. "2024-01-15" stays
// "Jan 15, 2024" whether the browser is in UTC, PST, or Auckland.
export function formatCalendarDate(str, fmt = 'MMM D, YYYY') {
  if (!str) return '';
  const s = String(str).slice(0, 10);
  const m = moment(s, 'YYYY-MM-DD', true);
  if (!m.isValid()) return '';
  return m.format(fmt);
}

// Normalize any date-ish input to a "YYYY-MM-DD" calendar string for storage
// or <input type="date"> value. Never UTC-shifts.
export function toCalendarString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const mo = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return '';
}
