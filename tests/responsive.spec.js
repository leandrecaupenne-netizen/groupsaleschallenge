// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// Smoke checks that the platform is usable on a phone viewport. These assertions
// are device-agnostic but are most meaningful on the "Mobile Chrome" / "Mobile
// Safari" projects:  npm run test:mobile

test.describe('Responsive', () => {
  test('renders the leaderboard without horizontal overflow', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('#tabs-bar')).toBeVisible();
    // No runaway horizontal scroll (allow a 2px rounding slack).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('tabs are reachable and switch content on a small screen', async ({ page }) => {
    await gotoApp(page);
    await page.locator('.tab-btn[data-tab="position"]').click();
    await expect(page.locator('#position-search')).toBeVisible();
  });
});
