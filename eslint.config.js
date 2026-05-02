import eslintConfigTs from '@electron-toolkit/eslint-config-ts';
import pluginReact from 'eslint-plugin-react';

const { configs } = eslintConfigTs;

export default [
  ...configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  {
    ignores: ['hooks/**', '*.config.ts', '*.config.js', 'out/**', 'dist/**', 'node_modules/**'],
  },
  {
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
