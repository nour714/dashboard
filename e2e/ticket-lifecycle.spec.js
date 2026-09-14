import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@africatravel.com';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'CiTestOnlyPassword123';

test.describe('Ticket Lifecycle & Financials', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Admin before each lifecycle test
    await page.goto('/login');
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('full lifecycle: create ticket -> add payment -> modify flight with split fees -> soft-delete and verify 404/empty state', async ({ page }) => {
    // 1. Navigate to Create Ticket
    await page.goto('/tickets/new');
    await expect(page.locator('#create-ticket-form')).toBeVisible();

    const uniquePnr = `PW${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueTicketNum = `077-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const passengerName = 'Playwright Test Passenger';

    // Fill Passenger info
    await page.fill('#cust-name', passengerName);
    await page.fill('#cust-passport', 'P12345678');
    await page.fill('#cust-phone', '+201001112233');

    // Fill Flight details
    const airlineSelect = page.locator('#flight-airline');
    // Select first valid airline option
    const options = await airlineSelect.locator('option').all();
    if (options.length > 1) {
      const val = await options[1].getAttribute('value');
      if (val) await airlineSelect.selectOption(val);
    }
    await page.fill('#flight-number', 'MS 800');
    await page.fill('#flight-pnr', uniquePnr);
    await page.fill('#flight-ticket-num', uniqueTicketNum);
    await page.fill('#flight-origin', 'CAI');
    await page.fill('#flight-dest', 'JED');
    await page.fill('#flight-dep-date', '2026-11-15');

    // Fill Pricing & Initial Payment
    // Price: 10,000 | Cost: 8,000 | Initial Paid: 3,000 -> Remaining: 7,000 | Initial Profit: 2,000
    await page.fill('#ticket-price', '10000');
    await page.fill('#ticket-cost-price', '8000');
    await page.fill('#initial-payment', '3000');

    // Submit form
    await page.click('#create-ticket-form button[type="submit"]');

    // 2. Verify redirect to ticket details page
    await expect(page).toHaveURL(/\/tickets\/TK-[\dA-Za-z]+$/);
    const ticketUrl = page.url();
    const ticketId = ticketUrl.split('/').pop();
    expect(ticketId).toBeTruthy();

    // Verify initial financials on details page
    const remainingEl = page.locator('.financial-item .remaining');
    await expect(remainingEl).toBeVisible();
    await expect(remainingEl).toContainText('7,000');

    // 3. Add payment of 2,000 -> Remaining balance should become 5,000
    await page.click('#action-add-payment-btn');
    await expect(page.locator('#record-payment-form')).toBeVisible();

    await page.fill('#pay-amount', '2000');
    await page.click('#modal-submit-pay');

    // Modal should close and remaining balance updates to 5,000
    await expect(page.locator('#record-payment-form')).not.toBeVisible();
    await expect(remainingEl).toContainText('5,000');

    // 4. Modify flight schedule with split fees:
    // Change Fee (customer): 1,200 | Airline Fee: 500
    // Net profit should increase by (1,200 - 500) = 700 -> from 2,000 to 2,700
    await page.click('#action-modify-flight-btn');
    await expect(page.locator('#modify-flight-form')).toBeVisible();

    await page.fill('#mod-airline-fee', '500');
    await page.fill('#mod-change-fee', '1200');
    await page.click('#modal-submit-mod');

    // Modal closes and profit updates
    await expect(page.locator('#modify-flight-form')).not.toBeVisible();

    // Verify net profit reflects 2,700 in financial banner
    const netProfitItem = page.locator('.financial-item').filter({ hasText: /Net Profit|صافي الربح/ });
    await expect(netProfitItem).toBeVisible();
    await expect(netProfitItem).toContainText('2,700');

    // 5. Soft-delete ticket (P0 regression test)
    await page.click('#action-delete-ticket-btn');
    const deleteModal = page.locator('#delete-ticket-confirm-input');
    await expect(deleteModal).toBeVisible();

    // Read placeholder to type exact confirmValue
    const placeholder = await deleteModal.getAttribute('placeholder');
    await deleteModal.fill(placeholder || uniqueTicketNum);

    const confirmDeleteBtn = page.locator('#modal-confirm-delete-ticket');
    await expect(confirmDeleteBtn).toBeEnabled();
    await confirmDeleteBtn.click();

    // Wait for redirect to /tickets
    await expect(page).toHaveURL(/\/tickets$/);

    // Verify deleted ticket is not listed in tickets table or mobile cards
    await page.waitForSelector('#tickets-table, .mobile-tickets-list, .empty-state, .page-body');
    const ticketRow = page.locator(`tr:has-text("${uniqueTicketNum}"), tr:has-text("${ticketId}"), .mobile-ticket-card:has-text("${uniqueTicketNum}")`);
    await expect(ticketRow).toHaveCount(0);

    // Directly navigate to the deleted ticket URL
    await page.goto(`/tickets/${ticketId}`);

    // Verify empty state is displayed with ticketNotFound message
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState.locator('.empty-state-title')).toBeVisible();
    await expect(emptyState.locator('.empty-state-desc')).toContainText(ticketId);
  });
});
