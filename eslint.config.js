// @ts-check
const { defineConfig } = require('eslint/config');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');
const jestDom = require('eslint-plugin-jest-dom');

module.exports = defineConfig(
    {
        ignores: [
            'projects/**/*',
            '.angular/**',
            'dist/**',
            'src/assets/**',
            'tailwind.config.js',
        ],
    },
    {
        // .eslintrc のときと同じく、使われていない eslint-disable は咎めない
        linterOptions: { reportUnusedDisableDirectives: 'off' },
    },
    {
        files: ['**/*.ts'],
        extends: [angular.configs.tsRecommended, prettier],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/component-selector': [
                'error',
                {
                    prefix: 'app',
                    style: 'kebab-case',
                    type: 'element',
                },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {
                    prefix: 'app',
                    style: 'camelCase',
                    type: 'attribute',
                },
            ],
        },
    },
    {
        files: ['**/*.spec.ts'],
        extends: [jestDom.configs['flat/recommended']],
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended],
    },
);
