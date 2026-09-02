import Controller from '@ember/controller';
import { isNotFound } from 'career-caddy-frontend/utils/is-not-found';

// Application-level `error` substate controller (CC-121).
//
// Ember resolves the application route's error substate to the plain `error`
// name (NOT `application_error`), so app/templates/error.hbs renders into
// application.hbs's {{outlet}} — which sits inside <MainApplication>, because
// `chromeless` keys on currentRouteName === 'profile' and during the substate
// the current route is 'error'. The app chrome is therefore preserved and the
// user is never shown a blank page.
//
// The substate transition passes the rejected error itself as the model, so
// `this.model` here IS the error.
export default class ErrorController extends Controller {
  get is404() {
    return isNotFound(this.model);
  }
}
