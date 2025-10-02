import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';

export default class FormatDateHelper extends Helper {
  @service moment;

  compute([date, format = 'YYYY-MM-DD']) {
    if (!date) return '';
    return this.moment.moment(date).format(format);
  }
}
