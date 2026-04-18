import Controller from '@ember/controller';

const SUGGESTIONS = [
  'openai:gpt-4o-mini',
  'openai:gpt-4o',
  'anthropic:claude-haiku-4-5',
  'anthropic:claude-sonnet-4-6',
  'ollama:qwen3-coder',
];

export default class AdminAiModelsController extends Controller {
  suggestions = SUGGESTIONS;

  get rows() {
    return this.model?.data ?? [];
  }

  get globalDefault() {
    return this.model?.meta?.global_default ?? 'openai:gpt-4o-mini';
  }

  get globalDefaultSource() {
    return this.model?.meta?.global_default_source ?? 'default';
  }
}
