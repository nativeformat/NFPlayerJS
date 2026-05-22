// Flat config. License-header enforcement is deferred to Phase 6 — see MODERNIZE.md.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist/',
      'demo/dist/',
      'demo/.cache/',
      '.cache-*/',
      'coverage/',
      'node_modules/',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Mid-modernization relaxations on a 6-year-old codebase. Tighten in Phase 6.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'prefer-spread': 'warn',
      'no-empty': 'warn',
      'no-async-promise-executor': 'warn',
    },
  },
];
