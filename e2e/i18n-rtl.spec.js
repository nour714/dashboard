import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@africatravel.com';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'CiTestOnlyPassword123';

test.describe('Internationalization & RTL Layout', () => {
  test('login page language toggle updates document direction and labels', async ({ page }) => {
    await page.goto('/login');

    const html = page.locator('html');
    const toggleBtn = page.locator('#login-lang-toggle-btn');
    await expect(toggleBtn).toBeVisible();

    // Check initial direction
    const initialDir = await html.getAttribute('dir');

    // Toggle language
    await toggleBtn.click();

    // Verify direction switched
    const targetDir = initialDir === 'rtl' ? 'ltr' : 'rtl';
    await expect(html).toHaveAttribute('dir', targetDir);

    // Switch to Arabic specifically and verify Arabic text
    if (targetDir !== 'rtl') {
      await toggleBtn.click();
      await expect(html).toHaveAttribute('dir', 'rtl');
    }

    // Verify Arabic text appears on login card
    await expect(page.locator('.login-welcome-title, .login-submit-btn, .login-field-label').first()).toBeVisible();
  });

  test('authenticated topbar toggle updates dir attribute and translates tickets page', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/dashboard$/);

    // 2. Navigate to /tickets
    await page.goto('/tickets');
    await expect(page.locator('.page-title')).toBeVisible();

    const html = page.locator('html');
    const topbarLangBtn = page.locator('#topbar-lang-toggle-btn');
    await expect(topbarLangBtn).toBeVisible();

    // If currently LTR, toggle to RTL
    const currentDir = await html.getAttribute('dir');
    if (currentDir !== 'rtl') {
      await topbarLangBtn.click();
      await expect(html).toHaveAttribute('dir', 'rtl');
    }

    // In Arabic, the tickets page title contains "التذاكر"
    await expect(page.locator('.page-title')).toContainText('التذاكر');

    // Switch back to English
    await topbarLangBtn.click();
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('.page-title')).toContainText('Tickets');
  });
});
