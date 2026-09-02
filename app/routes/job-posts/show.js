import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { isNotFound } from 'career-caddy-frontend/utils/is-not-found';

export default class JobPostsShowRoute extends Route {
  @service store;
  @service flashMessages;

  async model({ job_post_id }) {
    // `?include=duplicate-candidates` brings the candidate set in the same
    // round-trip as the JobPost itself — JP payload carries the
    // relationships.duplicate-candidates {data, links} block and the top-
    // level included[] holds the candidate resources, so Ember Data
    // populates the hasMany without a second request. The serializer-side
    // links.related declaration also makes a future .reload() work, but
    // the include= path is the one we actually exercise on every nav.
    return this.store
      .findRecord('job-post', job_post_id, {
        // `reposts` is included so the "X reposts of this" pill renders
        // its count without a follow-up sub-collection fetch. Phase C
        // dedupe redesign.
        include: 'scrapes,duplicate-candidates,reposts',
        reload: true,
      })
      .catch((error) => {
        // CC-121 layer 2 — graceful degradation, the pattern proven in
        // app/routes/profile.js. A 404 RESOLVES the model hook with a
        // sentinel POJO instead of rejecting, which keeps the user on the
        // URL they typed (the old error() action redirected to the index
        // and threw the id away) and lets the template render a contextual
        // hint inside the full app chrome.
        //
        // Anything that is not a 404 — 5xx, a network drop — is re-thrown
        // so it bubbles to the app-level `error` substate (layer 1,
        // app/templates/error.hbs). Swallowing those here would show a
        // "we couldn't find it" card for what is really a server outage.
        if (isNotFound(error)) {
          return { isNotFound: true, requestedId: job_post_id };
        }
        throw error;
      });
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.descriptionExpanded = false;
    // The not-found sentinel is a plain object, not a JobPost — it has no
    // belongsTo(). Bail before the company check so the degraded path can't
    // throw the very TypeError the degradation exists to avoid.
    if (model?.isNotFound) return;
    if (!model.belongsTo('company').id()) {
      this.flashMessages.warning('This job post has no associated company.', {
        sticky: true,
      });
    }
  }

  // NOTE: there is deliberately no `error()` action here. The old one flashed
  // and redirected with `return false`, which SWALLOWED the error — and a
  // swallowed error can never reach the app-level `error` substate. Removing
  // it is what makes layer 1 reachable from every route (CC-121).
}
