const js = require('@eslint/js');
const ember = require('eslint-plugin-ember');
const babelParser = require('@babel/eslint-parser');
const globals = require('globals');
const qunit = require('eslint-plugin-qunit');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  // Ignore block
  {
    ignores: ['dist/**', 'tmp/**', 'coverage/**', 'node_modules/**'],
  },

  // Base recommended
  js.configs.recommended,

  // Ember recommended (via FlatCompat)
  ...compat.extends('plugin:ember/recommended'),

  // App JavaScript block
  {
    files: ['**/*.js'],
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          plugins: [
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            ['@babel/plugin-proposal-class-properties', { loose: true }],
          ],
        },
      },
      globals: { ...globals.browser },
    },
    plugins: { ember },
    rules: {
      // You can add any additional custom rules or override existing ones here
    },
  },

  // Node/config-files block
  {
    files: [
      '**/*.config.js',
      'ember-cli-build.js',
      'testem.js',
      '.eslintrc.js',
      '.prettierrc.js',
      '.stylelintrc.js',
      '.template-lintrc.js',
      'config/**/*.js',
      'scripts/**/*.js',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // Per-file overrides
  {
    files: ['app/components/job-applications/edit.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // Tests block with QUnit
  ...compat.extends('plugin:qunit/recommended'),
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.qunit },
    },
    plugins: { qunit },
  },
];
