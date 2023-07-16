module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'plugin:editorconfig/all',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vitest/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'vitest', 'editorconfig'],
  overrides: [],
  parserOptions: { ecmaVersion: 12, sourceType: 'module' },
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
  ignorePatterns: ['dist', 'node_modules'],
}
