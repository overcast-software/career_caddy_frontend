import Transform from '@ember-data/serializer/transform';
import { toCalendarString } from 'career-caddy-frontend/utils/tz';

// DateField on the backend is a calendar date — "YYYY-MM-DD" with no TZ.
// Keep it that way end-to-end: the model attribute holds a plain string,
// templates render it via {{format-date}}, forms bind it directly to
// <input type="date"> which already speaks this format. No Date object
// is ever constructed, so no browser-local midnight → UTC drift.
export default class DateOnlyTransform extends Transform {
  serialize(value) {
    return toCalendarString(value) || null;
  }

  deserialize(value) {
    return toCalendarString(value) || null;
  }
}
