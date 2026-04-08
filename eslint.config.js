import electronConfig from '@electron-toolkit/eslint-config-ts';
import reactPlugin from 'eslint-plugin-react';

export default [
  {
    ignores: ['hooks/**', '*.config.ts', '*.config.js', 'out/**', 'dist/**'],
  },
  ...electronConfig.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
    },
    languageOptions: reactPlugin.configs.flat.recommended.languageOptions,
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat['jsx-runtime'].rules,
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
