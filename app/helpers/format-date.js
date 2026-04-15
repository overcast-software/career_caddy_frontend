import Helper from '@ember/component/helper';
import { service } from '@ember/service';

export default class FormatDateHelper extends Helper {
  @service moment;

  compute([date, format = 'YYYY-MM-DD']) {
    if (
      !date ||
      date === '' ||
      (typeof date === 'string' &&
        (date.toLowerCase() === 'now' || date.toLowerCase() === 'today'))
    ) {
      return this.currentDate(format);
    }

    const m = this.moment.moment(date);
    if (!m.isValid()) return '';

    return m.local().format(format);
  }

  currentDate(format = 'YYYY-MM-DD') {
    return this.moment.moment().format(format);
  }
}
