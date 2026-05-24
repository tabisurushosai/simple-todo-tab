import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', 'release/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                chrome: 'readonly',
            },
        },
        rules: {
            'no-undef': 'off',
        },
    },
    {
        files: ['src/core/**/*.ts'],
        rules: {
            'no-restricted-globals': ['error',
                {
                    name: 'chrome',
                    message: 'Keep src/core platform-neutral; access Chrome APIs through adapters outside core.',
                },
                {
                    name: 'document',
                    message: 'Keep src/core independent from the DOM; pass data through pure functions.',
                },
                {
                    name: 'window',
                    message: 'Keep src/core independent from browser globals; use platform adapters outside core.',
                },
                {
                    name: 'fetch',
                    message: 'Keep src/core offline and side-effect free; do network work outside core.',
                },
                {
                    name: 'localStorage',
                    message: 'Keep src/core independent from storage APIs; use src/storage adapters.',
                },
            ],
            'no-restricted-imports': ['error', {
                patterns: [{
                    group: ['../storage', '../storage/*', '../newtab', '../newtab.*'],
                    message: 'Keep src/core independent from UI and storage adapters.',
                }],
            }],
        },
    },
    {
        files: ['*.config.ts'],
        languageOptions: {
            globals: globals.node,
        },
        rules: {
            'no-undef': 'off',
        },
    },
);
