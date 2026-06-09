// Flat ESLint config for the Devoteam World Cup platform.
//
// Lints the vanilla-JS inline <script> in index.html (via eslint-plugin-html),
// the service worker, and the Node test scripts. There is intentionally NO root
// package.json: CI and the pre-push hook install eslint + plugins on the fly
// (same pattern as the Playwright UX tests), so this never adds a build/install
// step to the static Vercel deploy.
//
// Run locally:  npm i -D eslint eslint-plugin-html globals && npx eslint .
import html from 'eslint-plugin-html';
import globals from 'globals';

// High-signal rules only: real bugs (errors that fail CI) + a few noisy-but-useful
// ones as warnings (shown, but don't block). The app deliberately uses `== null`
// and empty `catch {}`, so eqeqeq is "smart" and empty-catch is allowed.
const jsRules = {
  'no-undef': 'error',
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-func-assign': 'error',
  'no-const-assign': 'error',
  'no-cond-assign': ['error', 'except-parens'],
  'no-unsafe-negation': 'error',
  'no-self-assign': 'error',
  'no-unreachable': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'eqeqeq': ['warn', 'smart'],
  'no-empty': ['warn', { allowEmptyCatch: true }],
  // args:'none' + caughtErrors:'none' — the app has many intentional `(e) => {}` and
  // `catch (e) {}` where the binding is deliberately ignored.
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
};

export default [
  // test/e2e is a self-contained, manually-run live-test subproject (own node_modules).
  { ignores: ['**/node_modules/**', 'cards/**', 'qr/**', 'history/**', 'test/e2e/**'] },
  {
    files: ['index.html'],
    plugins: { html },
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
    rules: jsRules,
  },
  {
    files: ['service-worker.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.serviceworker, ...globals.browser } },
    rules: jsRules,
  },
  {
    // Node test runners that ALSO contain browser snippets passed to page.evaluate(),
    // so they legitimately reference both Node and browser globals.
    files: ['test/**/*.cjs', 'test/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: jsRules,
  },
];
