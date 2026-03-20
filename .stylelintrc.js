'use strict';

module.exports = {
  extends: ['stylelint-config-standard'],
  ignoreFiles: [
    'tailwind-input.css',
    'public/assets/tailwind.css',
    'public/**/*.css',
  ],
  rules: {
    // Allow BEM double-dash naming convention alongside kebab-case
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(--[a-z0-9]+(-[a-z0-9]+)*)?(__[a-z0-9]+(-[a-z0-9]+)*(--[a-z0-9]+(-[a-z0-9]+)*)?)?$',
      { message: 'Expected class selector to be BEM or kebab-case' },
    ],
    // Disable specificity ordering rule (too strict for existing codebase)
    'no-descending-specificity': null,
    // Disable formatting rules that conflict with Prettier
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'comment-empty-line-before': null,
    'declaration-empty-line-before': null,
    // Allow @tailwind directives in source files
    'at-rule-no-unknown': [
      true,
      { ignoreAtRules: ['tailwind', 'apply', 'layer', 'config'] },
    ],
  },
};
