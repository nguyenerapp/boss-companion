import eslintConfigTs from '@electron-toolkit/eslint-config-ts';
import pluginReact from 'eslint-plugin-react';

const { configs } = eslintConfigTs;

export default [
  {
    ignores: [
      '**/.eslintrc.cjs',
      '**/eslint.config.js',
      '**/electron.vite.config.ts',
      '**/vitest.config.ts',
      'hooks/**',
    ],
  },
  ...configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect',
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
