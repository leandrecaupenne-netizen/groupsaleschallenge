// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// "My Position": a salesperson types their name and sees their standings.

test.describe('My Position', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await page.locator('.tab-btn[data-tab="position"]').click();
    await expect(page.locator('#position-search')).toBeVisible();
  });

  test('finds a real player by name', async ({ page }) => {
    await page.locator('#position-search').fill('Louis MASSON');
    // The player's card / standings should surface their name and team.
    await expect(page.getByText('Louis MASSON').first()).toBeVisible();
    await expect(page.getByText('LUXEMBOURG').first()).toBeVisible();
  });

  test('is case-insensitive and matches partial input', async ({ page }) => {
    await page.locator('#position-search').fill('carlos');
    await expect(page.getByText('Carlos MARAUI').first()).toBeVisible();
  });

  test('shows no spurious match for an unknown name', async ({ page }) => {
    await page.locator('#position-search').fill('Zzzz Nobody');
    await expect(page.getByText('Louis MASSON')).toHaveCount(0);
  });
});
