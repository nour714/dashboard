import { test, expect } from '@playwright/test';

const PROD_URL = process.env.PROD_URL || 'https://africiatravel.vercel.app';

test.describe('Production Smoke Test (read-only)', () => {
  test('health endpoint responds healthy', async ({ request }) => {
    const res = await request.get(`${PROD_URL}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('healthy');
    expect(body.data.database).toBe('connected');
  });

  test('homepage loads with correct assets', async ({ page }) => {
    const response = await page.goto(PROD_URL);
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page renders and login works with real admin', async ({ page }) => {
    const res = await page.goto(`${PROD_URL}/login`);
    expect(res.status()).toBeLessThan(400);
    await expect(page.locator('#login-email, input[type="email"]')).toBeVisible();
    await expect(page.locator('#login-password, input[type="password"]')).toBeVisible();
    await expect(page.locator('#login-submit-btn, button[type="submit"]')).toBeVisible();

    if (!process.env.PROD_SMOKE_ADMIN_PASSWORD) {
      console.log('ℹ️ Login page rendered and verified visible. PROD_SMOKE_ADMIN_PASSWORD not set in environment; skipping live credential submission.');
      return;
    }

    await page.fill('#login-email, input[type="email"]', 'admin@africatravel.com');
    await page.fill('#login-password, input[type="password"]', process.env.PROD_SMOKE_ADMIN_PASSWORD);
    await page.click('#login-submit-btn, button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|tickets/, { timeout: 15000 });
  });

  test('tickets list page loads without error (GET /api/tickets)', async ({ page }) => {
    if (!process.env.PROD_SMOKE_ADMIN_PASSWORD) {
      test.skip(true, 'PROD_SMOKE_ADMIN_PASSWORD is required to test authenticated tickets page.');
      return;
    }

    // Authenticate
    await page.goto(`${PROD_URL}/login`);
    await page.fill('#login-email, input[type="email"]', 'admin@africatravel.com');
    await page.fill('#login-password, input[type="password"]', process.env.PROD_SMOKE_ADMIN_PASSWORD);
    await page.click('#login-submit-btn, button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|tickets/, { timeout: 15000 });

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/tickets') && res.request().method() === 'GET'),
      page.click('a[href="/tickets"]')
    ]);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/\/tickets/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('customers page loads without error', async ({ page }) => {
    if (!process.env.PROD_SMOKE_ADMIN_PASSWORD) {
      test.skip(true, 'PROD_SMOKE_ADMIN_PASSWORD is required to test authenticated customers page.');
      return;
    }

    // Authenticate
    await page.goto(`${PROD_URL}/login`);
    await page.fill('#login-email, input[type="email"]', 'admin@africatravel.com');
    await page.fill('#login-password, input[type="password"]', process.env.PROD_SMOKE_ADMIN_PASSWORD);
    await page.click('#login-submit-btn, button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|tickets/, { timeout: 15000 });

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/customers') && res.request().method() === 'GET'),
      page.click('a[href="/customers"]')
    ]);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('static assets load (CSS/JS/manifest/sw)', async ({ request }) => {
    for (const path of ['/styles/tokens.css', '/js/app.js', '/manifest.json', '/sw.js']) {
      const res = await request.get(`${PROD_URL}${path}`);
      expect(res.status(), `${path} failed`).toBe(200);
    }
  });
});
