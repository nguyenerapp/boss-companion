import eslintConfigTs from '@electron-toolkit/eslint-config-ts';
import pluginReact from 'eslint-plugin-react';

export default [
  {
    ignores: [
      'out/**',
      'dist/**',
      'node_modules/**'
    ]
  },
  ...eslintConfigTs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  }
];
