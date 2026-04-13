import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';

const ELICITATION_RE =
  /```json\s*\n(\{[^`]*"elicitation"\s*:\s*true[^`]*\})\s*\n```\s*$/;

// LLM sometimes emits <a href="https://resumes/31"> instead of [text](/resumes/31).
// Catch these malformed URLs where the "hostname" is actually an app route segment.
const APP_ROUTES = new Set([
  'resumes',
  'job-posts',
  'job-applications',
  'companies',
  'scores',
  'cover-letters',
  'questions',
  'summaries',
  'scrapes',
  'career-data',
  'settings',
  'admin',
  'caddy',
]);

export default class ChatMessageComponent extends Component {
  @service chat;
  @service router;

  get elicitation() {
    if (this.args.message.role !== 'assistant') return null;
    const content = this.args.message.content || '';
    const match = content.match(ELICITATION_RE);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.elicitation && Array.isArray(parsed.actions)) {
        return parsed;
      }
    } catch {
      // malformed JSON — ignore
    }
    return null;
  }

  get displayContent() {
    if (!this.elicitation) return this.args.message.content;
    return this.args.message.content.replace(ELICITATION_RE, '').trim();
  }

  @action
  handleClick(event) {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('mailto:')) return;

    // Catch malformed LLM links like https://resumes/31 or http://job-posts/42
    if (href.startsWith('http')) {
      try {
        const url = new URL(href);
        if (APP_ROUTES.has(url.hostname)) {
          event.preventDefault();
          const path = `/${url.hostname}${url.pathname}`;
          this.router.transitionTo(path);
          return;
        }
      } catch {
        // invalid URL — fall through to default browser behavior
      }
      return;
    }

    event.preventDefault();
    const path = href.startsWith('/') ? href : `/${href}`;
    this.router.transitionTo(path);
  }

  @action
  sendAction(message) {
    this.chat.sendMessage(message);
  }
}
