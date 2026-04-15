import eslintConfigTs from '@electron-toolkit/eslint-config-ts';
import pluginReact from 'eslint-plugin-react';

const { configs } = eslintConfigTs;

export default [
  {
    ignores: ['out/**', 'dist/**', 'hooks/**', '*.config.ts', '*.config.js', '*.config.mjs', '*.config.cjs'],
  },
  ...configs.recommended,
  {
    plugins: {
      react: pluginReact,
    },
    languageOptions: pluginReact.configs.flat.recommended.languageOptions,
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReact.configs.flat['jsx-runtime'].rules,
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
