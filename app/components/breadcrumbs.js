import Component from '@glimmer/component';
import { service } from '@ember/service';

const LABELS = {
  'job-posts': 'Job Posts',
  'job-applications': 'Applications',
  'companies': 'Companies',
  'resumes': 'Resumes',
  'cover-letters': 'Cover Letters',
  'questions': 'Questions',
  'answers': 'Answers',
  'scores': 'Scores',
  'scrapes': 'Scrapes',
  'summaries': 'Summaries',
  'career-data': 'Career Data',
  'about': 'About',
  'new': 'New',
  'edit': 'Edit',
  'import': 'Import',
};

// Map full route name → { modelName, param key, display attribute }
const MODEL_MAP = {
  'companies.show': { modelName: 'company', param: 'company_id', attr: 'name' },
  'job-posts.show': { modelName: 'job-post', param: 'job_post_id', attr: 'title' },
  'resumes.show': { modelName: 'resume', param: 'resume_id', attr: 'name' },
  'questions.show': { modelName: 'question', param: 'question_id', attr: 'content' },
  'job-applications.show': {
    modelName: 'job-application',
    param: 'application_id',
    attr: null,
  },
  'cover-letters.show': {
    modelName: 'cover-letter',
    param: 'cover_letter_id',
    attr: null,
  },
  'job-posts.show.job-applications.show': {
    modelName: 'job-application',
    param: 'job_application_id',
    attr: null,
  },
};

export default class BreadcrumbsComponent extends Component {
  @service router;
  @service store;

  get crumbs() {
    // Read currentRouteName to establish Glimmer reactivity on route changes
    const _dep = this.router.currentRouteName; // eslint-disable-line no-unused-vars

    const route = this.router.currentRoute;
    if (!route) return [];

    // Collect from root → leaf
    const chain = [];
    let node = route;
    while (node) {
      chain.unshift(node);
      node = node.parent;
    }

    const accumulatedParams = [];
    const crumbs = [];

    for (const info of chain) {
      if (info.name === 'application' || info.localName === 'index') continue;

      const segmentParams = info.params ? Object.values(info.params).filter(Boolean) : [];

      const label = this._labelFor(info);

      if (label) {
        let routeName = null;
        let routeModels = null;
        try {
          this.router.urlFor(info.name, ...accumulatedParams, ...segmentParams);
          routeName = info.name;
          routeModels = [...accumulatedParams, ...segmentParams];
        } catch {
          // can't build a valid URL, render as plain text
        }
        crumbs.push({ label, routeName, routeModels });
      }

      accumulatedParams.push(...segmentParams);
    }

    return crumbs.map((c, i) => ({ ...c, isFirst: i === 0 }));
  }

  _labelFor(info) {
    const modelConfig = MODEL_MAP[info.name];

    if (modelConfig) {
      const id = info.params?.[modelConfig.param];
      if (id) {
        const record = this.store.peekRecord(modelConfig.modelName, id);
        if (modelConfig.attr && record?.[modelConfig.attr]) {
          const raw = record[modelConfig.attr];
          return raw.length > 32 ? raw.slice(0, 29) + '…' : raw;
        }
        return `#${id}`;
      }
    }

    return LABELS[info.localName] ?? null;
  }
}
