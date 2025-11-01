import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsIndexRoute extends Route {
  @service store;
  @service currentUser;
  async model() {
    if (!this.currentUser.user) {
      await this.currentUser.load();
    }
    const userId = this.currentUser.user?.id;
    if (!userId) {
      return [];
    }
    return this.store.query('application', {
      user: userId,
      include: 'job-post,resume,cover-letter',
    });
  }
}
