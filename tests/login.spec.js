// @ts-check
const { test, expect } = require('@playwright/test');
const { mockBackend, ACCESS_CODE } = require('./helpers');

// The login screen is the first thing every (non-authenticated) visitor sees.
// These specs go through the real form rather than seeding the session, so they
// exercise attemptLogin() end to end against the mocked backend.

test.describe('Login', () => {
  test('shows the access-code screen when not authenticated', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await expect(page.locator('#login-pwd')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible();
    // The app chrome (tabs) must not be shown yet.
    await expect(page.locator('#tabs-bar')).toHaveCount(0);
  });

  test('rejects a wrong access code with an inline error', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.locator('#login-pwd').fill('not-the-password');
    await page.locator('#login-btn').click();
    await expect(page.locator('.login-error')).not.toHaveText('');
    // Still on the login screen.
    await expect(page.locator('#login-pwd')).toBeVisible();
  });

  test('grants access with the correct code and lands on the leaderboard', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.locator('#login-pwd').fill(ACCESS_CODE);
    await page.locator('#login-btn').click();
    await expect(page.locator('#tabs-bar')).toBeVisible();
    await expect(page.locator('.tab-btn.active')).toHaveText(/Team Ranking/);
  });

  test('persists the session across a reload', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.locator('#login-pwd').fill(ACCESS_CODE);
    await page.locator('#login-btn').click();
    await expect(page.locator('#tabs-bar')).toBeVisible();

    await page.reload();
    // No login screen on the way back in — straight to the app.
    await expect(page.locator('#tabs-bar')).toBeVisible();
    await expect(page.locator('#login-pwd')).toHaveCount(0);
  });

  test('Enter key submits the form', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.locator('#login-pwd').fill(ACCESS_CODE);
    await page.locator('#login-pwd').press('Enter');
    await expect(page.locator('#tabs-bar')).toBeVisible();
  });
});
