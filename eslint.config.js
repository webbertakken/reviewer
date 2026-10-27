import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(globalIgnores(['dist', 'node_modules', 'coverage']), {
  files: ['**/*.{js,mjs,cjs,ts,mts}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    vitest.configs.recommended,
    prettier,
  ],
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    globals: globals.node,
  },
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
})
