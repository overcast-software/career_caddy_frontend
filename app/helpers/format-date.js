import Helper from '@ember/component/helper';
import moment from 'moment';
import {
  formatInstant,
  formatCalendarDate,
} from 'career-caddy-frontend/utils/tz';

// Timezone policy lives in app/utils/tz.js. This helper routes to it.
//
// Usage:
//   {{format-date answer.createdAt "MMM D, YYYY"}}      — instant → PST
//   {{format-date exp.startDate "MM.YYYY"}}             — calendar date (no TZ)
//   {{format-date "now"}}                               — current time, today's date fmt
//
// We auto-detect "calendar string" shape ("YYYY-MM-DD" exactly, 10 chars, no
// time component) so existing templates keep working without passing a mode
// flag. Anything with a "T" or timezone marker is treated as an instant.
const CALENDAR_RE = /^\d{4}-\d{2}-\d{2}$/;

export default class FormatDateHelper extends Helper {
  compute([date, format = 'YYYY-MM-DD']) {
    if (!date || date === '') return moment().format(format);

    if (typeof date === 'string') {
      const lower = date.toLowerCase();
      if (lower === 'now' || lower === 'today') {
        return moment().format(format);
      }
      if (CALENDAR_RE.test(date)) {
        return formatCalendarDate(date, format);
      }
    }

    return formatInstant(date, format);
  }
}
