import Helper from '@ember/component/helper';
import { service } from '@ember/service';

export default class FormatDateHelper extends Helper {
  @service moment;

  compute([date, format = 'YYYY-MM-DD']) {
    if (!date || date === '' || 
        (typeof date === 'string' && (date.toLowerCase() === 'now' || date.toLowerCase() === 'today'))) {
      return this.currentDate(format);
    }
    return this.moment.moment(date).format(format);
  }
  
  currentDate(format = 'YYYY-MM-DD') {
    return this.moment.moment().format(format);
  }
}
