// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoApp, mockBackend, seedSession } = require('./helpers');

// The "live" plumbing: the Last-updated timestamp wired to the API payload,
// and graceful failure when the Apps Script backend is unreachable.

test.describe('Live data', () => {
  test('header shows the API timestamp and period', async ({ page }) => {
    await gotoApp(page);
    const lastUpdate = page.locator('#last-update');
    await expect(lastUpdate).toContainText('Last updated');
    await expect(lastUpdate).toContainText('Week 3 of 5'); // period from the fixture
  });

  test('cold start with the backend down shows a retry state, not a blank page', async ({ page }) => {
    // No cached snapshot + failing backend → the cold path renders the error UI.
    await mockBackend(page, { fail: true });
    await seedSession(page);
    await page.goto('/');
    await expect(page.locator('.state-msg.error')).toBeVisible();
    await expect(page.getByText(/Failed to load data/i)).toBeVisible();
  });

  test('serves fresh data on each successful load (poll-able)', async ({ page }) => {
    let dataHits = 0;
    await mockBackend(page, { onData: () => { dataHits += 1; } });
    await seedSession(page);
    await page.goto('/');
    await page.locator('#tabs-bar').waitFor({ state: 'visible' });
    // At least the initial load hit the data endpoint.
    expect(dataHits).toBeGreaterThanOrEqual(1);
  });
});
