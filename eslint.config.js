import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import licenseHeader from 'eslint-plugin-license-header';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

const apacheHeader = [
  '/*',
  ' * Copyright (c) 2018-Present, Spotify AB.',
  ' *',
  ' * Licensed to the Apache Software Foundation (ASF) under one',
  ' * or more contributor license agreements.  See the NOTICE file',
  ' * distributed with this work for additional information',
  ' * regarding copyright ownership.  The ASF licenses this file',
  ' * to you under the Apache License, Version 2.0 (the',
  ' * "License"); you may not use this file except in compliance',
  ' * with the License.  You may obtain a copy of the License at',
  ' *',
  ' *   http://www.apache.org/licenses/LICENSE-2.0',
  ' *',
  ' * Unless required by applicable law or agreed to in writing,',
  ' * software distributed under the License is distributed on an',
  ' * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY',
  ' * KIND, either express or implied.  See the License for the',
  ' * specific language governing permissions and limitations',
  ' * under the License.',
  ' */',
];

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
    files: ['src/**/*.ts', 'demo/src/**/*.{ts,tsx}'],
    plugins: { 'license-header': licenseHeader },
    rules: {
      'license-header/header': ['error', apacheHeader],
    },
  },
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
];
