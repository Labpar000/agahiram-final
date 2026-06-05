/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['./packages/config/eslint/base.js'],
  ignorePatterns: [
    '**/dist/**',
    '**/.next/**',
    '**/node_modules/**',
    '**/*.config.*',
    'apps/api/dist/**',
    '**/*.spec.ts',
  ],
};
