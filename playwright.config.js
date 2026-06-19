// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config for the Devoteam World Cup Sales Challenge platform.
 *
 * The app is a single static index.html that fetches its data from a Google
 * Apps Script endpoint. Tests never hit the real backend — every spec mocks the
 * Apps Script route (see tests/helpers.js), so the suite is fast, deterministic
 * and runnable offline / in CI without secrets.
 *
 * The `webServer` block boots the tiny dependency-free static server in
 * tests/server.js before the run and shuts it down after.
 */
const PORT = Number(process.env.PORT || 4173);
const BASE_URL = `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  // Run every *.spec.js — server.js / helpers.js are ignored (no `.spec.`).
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list'], ['github']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',     // capture a trace when a test is retried
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 14'] } }
  ],

  webServer: {
    command: 'node tests/server.js',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
    env: { PORT: String(PORT) }
  }
});
