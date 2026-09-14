import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@africatravel.com';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'CiTestOnlyPassword123';

test.describe('Authentication Flows', () => {
  test('successful admin login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('#login-email')).toBeVisible();
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-submit-btn');

    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('login with invalid password shows error toast and stays on login page', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', 'WrongPassword123!');
    await page.click('#login-submit-btn');

    // Error toast should appear
    const toast = page.locator('.toast.toast-error, .toast');
    await expect(toast).toBeVisible();

    // Must NOT redirect away from /login
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logout returns to login and protected routes redirect back to login', async ({ page }) => {
    // 1. Log in first
    await page.goto('/login');
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/dashboard$/);

    // 2. Click sign out in sidebar
    const signOutBtn = page.locator('#sidebar-sign-out-btn');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // 3. Should return to /login
    await expect(page).toHaveURL(/\/login$/);

    // 4. Attempting to visit protected route (/dashboard or /tickets) redirects to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/login$/);
  });
});
