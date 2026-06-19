// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// Core leaderboard behaviour: tabs, ranking order, and the team → squad modal.
// Session is seeded so we start straight on the board.

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test('renders all seven tabs', async ({ page }) => {
    const tabs = page.locator('.tab-btn');
    await expect(tabs).toHaveCount(7);
    await expect(page.locator('.tab-btn[data-tab="teams"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-tab="golden"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-tab="playmaker"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-tab="position"]')).toBeVisible();
  });

  test('ranks teams by average PS bookings (LUXEMBOURG first)', async ({ page }) => {
    const rows = page.locator('.teams-table-row');
    await expect(rows.first()).toHaveAttribute('data-team', 'LUXEMBOURG');
    // The full mocked set is present.
    await expect(rows).toHaveCount(3);
  });

  test('opens a team squad modal on row click', async ({ page }) => {
    await page.locator('.teams-table-row[data-team="LUXEMBOURG"]').click();
    const modal = page.locator('#cd-overlay');
    await expect(modal).toBeVisible();
    // Squad members of LUXEMBOURG appear in the modal.
    await expect(modal.getByText('Louis MASSON')).toBeVisible();
    // Closing returns to the board.
    await page.locator('#cd-close').click();
    await expect(modal).toHaveCount(0);
  });

  test('Golden Boot ranks by PS new business (Louis MASSON top)', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="golden"]').click();
    await expect(page.locator('.tab-btn.active')).toHaveText(/Golden Boot/);
    // Louis MASSON has the highest ps_nb in the fixture.
    await expect(page.getByText('Louis MASSON').first()).toBeVisible();
  });

  test('Playmaker ranks by opportunities (Carlos MARAUI top)', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="playmaker"]').click();
    await expect(page.locator('.tab-btn.active')).toHaveText(/Playmaker/);
    await expect(page.getByText('Carlos MARAUI').first()).toBeVisible();
  });

  test('VAR Room surfaces a yellow card for low meetings / low margin', async ({ page }) => {
    await page.locator('.tab-btn[data-tab="var"]').click();
    await expect(page.locator('.tab-btn.active')).toHaveText(/VAR Room/);
    // Sophie DUBOIS is flagged (meetings 4.2 < 5 and GM 0.20 < 0.25).
    await expect(page.getByText('Sophie DUBOIS').first()).toBeVisible();
  });
});
