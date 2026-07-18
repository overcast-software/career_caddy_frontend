import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsShowRoute extends Route {
  @service store;
  @service router;
  async model({ application_id }) {
    // include=application-statuses so <Applications::StatusLog> has rows to
    // render. The serializer emits linkage data for the hasMany; without the
    // include the sideload is empty and the history section shows
    // "No history yet" even when the DB has entries.
    return this.store.findRecord('job-application', application_id, {
      include: 'application-statuses',
    });
  }

  // Canonical application page is nested under its job post — redirect
  // /job-applications/:id → /job-posts/:jp_id/job-applications/:ja_id when
  // the JA has a post. Uses the relationship LINKAGE id (no extra fetch),
  // and replaceWith so Back doesn't bounce through the flat URL. Only the
  // show page itself redirects: deep links into the flat questions/answers
  // subtree stay put (the nested tree doesn't mirror them).
  afterModel(model, transition) {
    if (transition.to?.name !== 'job-applications.show.index') return;
    const jobPostId = model.belongsTo('jobPost').id();
    if (jobPostId) {
      this.router.replaceWith(
        'job-posts.show.job-applications.show',
        jobPostId,
        model.id,
      );
    }
  }
}
