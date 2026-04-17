import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class ExtensionsService extends Service {
  @tracked navEntries = [];

  register(entries) {
    this.navEntries = [...this.navEntries, ...entries];
  }

  entriesAt(position) {
    return this.navEntries.filter((e) => e.position === position);
  }
}
