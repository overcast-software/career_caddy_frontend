import setupDeprecationWorkflow from 'ember-cli-deprecation-workflow';

/**
 * Docs: https://github.com/ember-cli/ember-cli-deprecation-workflow
 */
setupDeprecationWorkflow({
  /**
    false by default, but if a developer / team wants to be more aggressive about being proactive with
    handling their deprecations, this should be set to "true"
  */
  throwOnUnhandled: false,
  workflow: [
    /* ... handlers ... */
    /* to generate this list, run your app for a while (or run the test suite),
     * and then run in the browser console:
     *
     *    deprecationWorkflow.flushDeprecations()
     *
     * And copy the handlers here
     */
    { handler: 'silence', matchId: 'importing-inject-from-ember-service' },
    { handler: 'silence', matchId: 'deprecate-import-view-utils-from-ember' },
    {
      handler: 'silence',
      matchId: 'deprecate-import--set-classic-decorator-from-ember',
    },
    { handler: 'silence', matchId: 'deprecate-import-testing-from-ember' },
    { handler: 'silence', matchId: 'warp-drive.deprecate-tracking-package' },
    { handler: 'silence', matchId: 'ember-data:deprecate-legacy-imports' },
  ],
});
