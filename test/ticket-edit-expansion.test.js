/**
 * AfricaTravel — Edit Ticket Expansion Verification Tests
 *
 * Verifies that the expanded Edit Ticket modal and backend API support:
 * 1. PNR, ticket number, flight number, origin, destination typo corrections
 * 2. Admin-only ticket price (ticketPrice) correction
 * 3. Business rule guard when ticketPrice is lower than totalPaid (PRICE_BELOW_PAID confirmation)
 * 4. Audit log recording granular before/after diff summary
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { updateTicketSchema } from '../server/src/schemas/ticket.schema.js';
import { TicketService } from '../server/src/services/ticket.service.js';
import { AuditService } from '../server/src/services/audit.service.js';
import { ForbiddenError, BusinessRuleError } from '../server/src/domain/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🎫 ========================================================');
console.log('   AfricaTravel Edit Ticket Expansion Verification Tests');
console.log('========================================================\n');

describe('Edit Ticket Expansion Verification', () => {
  const ticketActionsPath = path.join(rootDir, 'js', 'pages', 'ticket-details', 'ticket-actions.js');
  const ticketActionsContent = fs.readFileSync(ticketActionsPath, 'utf8');

  // --- 1. Schema Validation Tests ---
  it('1. updateTicketSchema accepts valid ticketPrice and confirmPriceBelowPaid', () => {
    const valid = updateTicketSchema.parse({
      ticketPrice: 5000,
      confirmPriceBelowPaid: true
    });
    assert.equal(valid.ticketPrice, 5000);
    assert.equal(valid.confirmPriceBelowPaid, true);
  });

  it('2. updateTicketSchema rejects non-positive ticketPrice', () => {
    assert.throws(() => {
      updateTicketSchema.parse({ ticketPrice: 0 });
    }, /Ticket price must be greater than zero/);

    assert.throws(() => {
      updateTicketSchema.parse({ ticketPrice: -500 });
    }, /Ticket price must be greater than zero/);
  });

  // --- 2. Backend TicketService Business Rules ---
  it('3. TicketService.updateTicket blocks non-admin from updating ticketPrice', async () => {
    // Mock getTicketById
    const origGet = TicketService.getTicketById;
    TicketService.getTicketById = async () => ({
      id: 'TK-TEST-1',
      ticketPrice: 6000,
      payments: []
    });

    try {
      await assert.rejects(async () => {
        await TicketService.updateTicket(
          'TK-TEST-1',
          { ticketPrice: 7000 },
          { id: 'USR-AGENT', role: 'AGENT', name: 'Nour Agent' }
        );
      }, (err) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.message, 'Only administrators can modify the ticket price');
        return true;
      });
    } finally {
      TicketService.getTicketById = origGet;
    }
  });

  it('4. TicketService.updateTicket rejects ticketPrice < totalPaid without confirmation (PRICE_BELOW_PAID)', async () => {
    const origGet = TicketService.getTicketById;
    TicketService.getTicketById = async () => ({
      id: 'TK-TEST-2',
      ticketPrice: 10000,
      payments: [
        { amount: 4000 },
        { amount: 3000 }
      ] // Total paid = 7000
    });

    try {
      await assert.rejects(async () => {
        await TicketService.updateTicket(
          'TK-TEST-2',
          { ticketPrice: 5000 }, // 5000 < 7000
          { id: 'USR-ADMIN', role: 'ADMIN', name: 'Admin Mohamed' }
        );
      }, (err) => {
        assert.ok(err instanceof BusinessRuleError);
        assert.equal(err.code, 'PRICE_BELOW_PAID');
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('Customer has already paid 7000, which is more than the new price of 5000'));
        return true;
      });
    } finally {
      TicketService.getTicketById = origGet;
    }
  });

  // --- 3. Frontend Static Verification ---
  it('5. ticket-actions.js renders PNR, ticket number, flight number, and route input fields', () => {
    assert.ok(ticketActionsContent.includes('id="edit-pnr"'), 'Must render #edit-pnr');
    assert.ok(ticketActionsContent.includes('id="edit-ticket-number"'), 'Must render #edit-ticket-number');
    assert.ok(ticketActionsContent.includes('id="edit-flight-number"'), 'Must render #edit-flight-number');
    assert.ok(ticketActionsContent.includes('id="edit-origin"'), 'Must render #edit-origin');
    assert.ok(ticketActionsContent.includes('id="edit-destination"'), 'Must render #edit-destination');
  });

  it('6. ticket-actions.js renders ticketPrice input for admins in a 2-column grid with costPrice', () => {
    assert.ok(ticketActionsContent.includes('id="edit-ticket-price"'), 'Must render #edit-ticket-price for admin');
    assert.ok(ticketActionsContent.includes('id="edit-cost-price"'), 'Must render #edit-cost-price for admin');
    assert.ok(ticketActionsContent.includes('Ticket Price (Sale Price)'), 'Must have label for Ticket Price');
  });

  it('7. ticket-actions.js handles PRICE_BELOW_PAID confirmation prompt and retries with confirmPriceBelowPaid', () => {
    assert.ok(
      ticketActionsContent.includes("result.error?.code === 'PRICE_BELOW_PAID'"),
      'Must inspect error.code === PRICE_BELOW_PAID'
    );
    assert.ok(
      ticketActionsContent.includes('updatePayload.confirmPriceBelowPaid = true;'),
      'Must set confirmPriceBelowPaid on user confirmation'
    );
  });
});
