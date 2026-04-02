import eslintConfigTs from '@electron-toolkit/eslint-config-ts';
import pluginReact from 'eslint-plugin-react';

export default [
  ...eslintConfigTs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react/react-in-jsx-scope': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
