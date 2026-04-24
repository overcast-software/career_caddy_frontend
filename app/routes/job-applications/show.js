import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsShowRoute extends Route {
  @service store;
  @service flashMessages;
  @service router;
  async model({ application_id }) {
    if (!application_id) {
      this.flashMessages.warning('redirecting to new');
      this.router.transitionTo('job-application.new');
    }
    // include=application-statuses so <Applications::StatusLog> has rows to
    // render. The serializer emits linkage data for the hasMany; without the
    // include the sideload is empty and the history section shows
    // "No history yet" even when the DB has entries.
    return this.store.findRecord('job-application', application_id, {
      include: 'application-statuses',
    });
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    if (!model.belongsTo('company').id()) {
      this.flashMessages.warning(
        'This application has no associated company.',
        { sticky: true },
      );
    }
  }
}
