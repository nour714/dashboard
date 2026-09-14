import { test, expect } from '@playwright/test';

const AGENT_EMAIL = 'nour.w@africatravel.com';
const ADMIN_EMAIL = 'admin@africatravel.com';
const PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'CiTestOnlyPassword123';

test.describe('RBAC Visibility Enforcement', () => {
  test('AGENT cannot see costPrice, netProfit, or airlineFee in the DOM', async ({ page }) => {
    // 1. Log in as AGENT
    await page.goto('/login');
    await page.fill('#login-email', AGENT_EMAIL);
    await page.fill('#login-password', PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/dashboard$/);

    // 2. Open tickets list and navigate to first ticket details
    await page.goto('/tickets');
    const ticketLink = page.locator('a[href^="/tickets/TK-"]:visible').first();
    await expect(ticketLink).toBeVisible();
    await ticketLink.click();
    await expect(page.locator('.financial-ledger-banner')).toBeVisible();

    // 3. Verify costPrice is completely absent from DOM (not just CSS hidden)
    const costPriceItem = page.locator('.financial-item').filter({ hasText: /Cost Price|سعر التكلفة/ });
    expect(await costPriceItem.count()).toBe(0);

    // 4. Verify netProfit is completely absent from DOM
    const netProfitItem = page.locator('.financial-item').filter({ hasText: /Net Profit|صافي الربح/ });
    expect(await netProfitItem.count()).toBe(0);

    // 5. Check modifications tab: airlineFee should NOT exist in the DOM
    const modTabBtn = page.locator('button[data-tab-target="modifications"]');
    if (await modTabBtn.isVisible()) {
      await modTabBtn.click();
      const airlineFeeElements = page.locator('span, div, strong').filter({ hasText: /Airline Fee|رسوم شركة الطيران/ });
      expect(await airlineFeeElements.count()).toBe(0);
    }
  });

  test('ADMIN can see costPrice and netProfit in the DOM', async ({ page }) => {
    // 1. Log in as ADMIN
    await page.goto('/login');
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/dashboard$/);

    // 2. Open tickets list and navigate to first ticket details
    await page.goto('/tickets');
    const ticketLink = page.locator('a[href^="/tickets/TK-"]:visible').first();
    await expect(ticketLink).toBeVisible();
    await ticketLink.click();
    await expect(page.locator('.financial-ledger-banner')).toBeVisible();

    // 3. Verify costPrice is present and visible
    const costPriceItem = page.locator('.financial-item').filter({ hasText: /Cost Price|سعر التكلفة/ });
    await expect(costPriceItem).toBeVisible();

    // 4. Verify netProfit is present and visible
    const netProfitItem = page.locator('.financial-item').filter({ hasText: /Net Profit|صافي الربح/ });
    await expect(netProfitItem).toBeVisible();
  });
});
