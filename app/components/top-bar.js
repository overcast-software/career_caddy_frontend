import Component from '@glimmer/component';
import ENV from 'career-caddy-frontend/config/environment';

export default class TopBarComponent extends Component {
  get aboutUrl() {
    return ENV.APP.PUBLIC_LINKS.aboutUrl;
  }

  get docsUrl() {
    return ENV.APP.PUBLIC_LINKS.docsUrl;
  }

  get githubUrl() {
    return ENV.APP.PUBLIC_LINKS.githubUrl;
  }
}
