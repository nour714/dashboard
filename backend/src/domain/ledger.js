/**
 * AfricaTravel - Financial Ledger Engine (Single Source of Truth)
 *
 * Implements strict Decimal arithmetic for per-ticket financial accounting,
 * currency-grouped KPI aggregation, and audit-compliant profit calculation.
 */

import Decimal from 'decimal.js';
import { asDecimal, moneyNumber } from '../utils/money.js';

/**
 * Determines whether a payment was recorded specifically for a flight modification fee.
 * @param {object} p
 * @returns {boolean}
 */
export function isModificationPayment(p = {}) {
  return p?.type === 'MODIFICATION';
}

/**
 * Computes the complete financial ledger for a single ticket.
 *
 * @param {object} ticket
 * @returns {{
 *   totalPaid: number,
 *   modificationFees: number,
 *   modificationPaid: number,
 *   modificationOutstanding: number,
 *   remaining: number,
 *   totalRefunded: number,
 *   pendingRefunds: number,
 *   availableRefund: number,
 *   totalAirlineRefunded: number,
 *   modificationProfit: number,
 *   netProfit: number|null,
 *   paymentStatus: string,
 *   currency: string,
 *   netValue: number
 * }}
 */
export function computeTicketLedger(ticket = {}) {
  const currency = ticket.currency || 'EGP';
  const payments = Array.isArray(ticket.payments) ? ticket.payments : [];
  const refunds = Array.isArray(ticket.refunds) ? ticket.refunds : [];
  const modifications = Array.isArray(ticket.modifications) ? ticket.modifications : [];

  // Ticket-type payments only
  let totalPaidDec = asDecimal(0);
  let modificationPaidDec = asDecimal(0);

  for (const p of payments) {
    const amount = asDecimal(p.amount || 0);
    if (isModificationPayment(p)) {
      modificationPaidDec = modificationPaidDec.plus(amount);
    } else {
      totalPaidDec = totalPaidDec.plus(amount);
    }
  }

  // Modification fees and profit
  let modificationFeesDec = asDecimal(0);
  let modificationProfitDec = asDecimal(0);

  for (const m of modifications) {
    const changeFee = asDecimal(m.changeFee || 0);
    const airlineFee = asDecimal(m.airlineFee || 0);
    modificationFeesDec = modificationFeesDec.plus(changeFee);
    modificationProfitDec = modificationProfitDec.plus(changeFee.minus(airlineFee));
  }

  const modificationOutstandingDec = Decimal.max(0, modificationFeesDec.minus(modificationPaidDec));

  // Refunds breakdown:
  // Completed/Approved customer refunds
  let totalRefundedDec = asDecimal(0);
  // Pending customer refunds
  let pendingRefundsDec = asDecimal(0);
  // Total airline refund received
  let totalAirlineRefundedDec = asDecimal(0);

  for (const r of refunds) {
    const rStatus = (r.status || '').toUpperCase();
    const rAmount = asDecimal(r.amount || 0);
    const rAirAmount = asDecimal(r.airlineRefundAmount || 0);

    if (rStatus === 'COMPLETED' || rStatus === 'REFUNDED' || rStatus === 'APPROVED') {
      totalRefundedDec = totalRefundedDec.plus(rAmount);
      totalAirlineRefundedDec = totalAirlineRefundedDec.plus(rAirAmount);
    } else if (rStatus === 'PENDING' || rStatus === 'REQUESTED') {
      pendingRefundsDec = pendingRefundsDec.plus(rAmount);
    }
    // REJECTED is ignored
  }

  // availableRefund = totalPaid - completed/approved - pending (clamped at 0)
  const availableRefundDec = Decimal.max(
    0,
    totalPaidDec.minus(totalRefundedDec).minus(pendingRefundsDec)
  );

  const ticketPriceDec = asDecimal(ticket.ticketPrice || 0);
  const status = (ticket.status || 'UNPAID').toUpperCase();

  // remaining: 0 for CANCELLED or REFUNDED
  let remainingDec = asDecimal(0);
  if (status !== 'CANCELLED' && status !== 'REFUNDED') {
    remainingDec = Decimal.max(0, ticketPriceDec.minus(totalPaidDec));
  }

  // netProfit rules:
  // - costPrice null/undefined => netProfit null
  // - CANCELLED / REFUNDED / PARTIALLY_REFUNDED:
  //     max(0, paid - customerRefunded) - max(0, cost - airlineRefunded) + modificationProfit
  // - Active ticket:
  //     price - cost + modificationProfit
  let netProfit = null;
  if (ticket.costPrice !== null && ticket.costPrice !== undefined) {
    const costPriceDec = asDecimal(ticket.costPrice);
    if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') {
      const retainedCustomer = Decimal.max(0, totalPaidDec.minus(totalRefundedDec));
      const netAirlineCost = Decimal.max(0, costPriceDec.minus(totalAirlineRefundedDec));
      const profitDec = retainedCustomer.minus(netAirlineCost).plus(modificationProfitDec);
      netProfit = moneyNumber(profitDec);
    } else {
      const profitDec = ticketPriceDec.minus(costPriceDec).plus(modificationProfitDec);
      netProfit = moneyNumber(profitDec);
    }
  }

  // paymentStatus
  let paymentStatus = 'UNPAID';
  if (status === 'CANCELLED') {
    paymentStatus = 'CANCELLED';
  } else if (status === 'REFUNDED') {
    paymentStatus = 'REFUNDED';
  } else if (status === 'PARTIALLY_REFUNDED') {
    paymentStatus = 'PARTIALLY_REFUNDED';
  } else if (status === 'REFUND REQUESTED' || pendingRefundsDec.greaterThan(0)) {
    paymentStatus = 'REFUND REQUESTED';
  } else if (ticketPriceDec.lessThanOrEqualTo(0)) {
    paymentStatus = 'CONFIRMED';
  } else if (totalPaidDec.greaterThanOrEqualTo(ticketPriceDec)) {
    paymentStatus = 'CONFIRMED';
  } else if (totalPaidDec.greaterThan(0)) {
    paymentStatus = 'PARTIALLY PAID';
  } else {
    paymentStatus = 'UNPAID';
  }

  const netValueDec = Decimal.max(0, ticketPriceDec.minus(totalRefundedDec));

  return {
    totalPaid: moneyNumber(totalPaidDec),
    modificationFees: moneyNumber(modificationFeesDec),
    modificationPaid: moneyNumber(modificationPaidDec),
    modificationOutstanding: moneyNumber(modificationOutstandingDec),
    remaining: moneyNumber(remainingDec),
    totalRefunded: moneyNumber(totalRefundedDec),
    pendingRefunds: moneyNumber(pendingRefundsDec),
    availableRefund: moneyNumber(availableRefundDec),
    totalAirlineRefunded: moneyNumber(totalAirlineRefundedDec),
    modificationProfit: moneyNumber(modificationProfitDec),
    netProfit,
    costPrice: ticket.costPrice !== null && ticket.costPrice !== undefined ? moneyNumber(asDecimal(ticket.costPrice)) : null,
    ticketPrice: moneyNumber(ticketPriceDec),
    paymentStatus,
    currency,
    netValue: moneyNumber(netValueDec)
  };
}

/**
 * Aggregates financial ledgers across an array of tickets, grouped strictly by currency.
 *
 * Sales, outstanding, and collectionRate exclude CANCELLED/REFUNDED tickets.
 * Collected and refunds stay gross.
 *
 * @param {Array<object>} tickets
 * @returns {{
 *   byCurrency: Record<string, {
 *     currency: string,
 *     totalTickets: number,
 *     activeTickets: number,
 *     sales: number,
 *     collected: number,
 *     outstanding: number,
 *     refunds: number,
 *     pendingRefunds: number,
 *     modificationFees: number,
 *     modificationCollected: number,
 *     modificationOutstanding: number,
 *     modificationProfit: number,
 *     grossProfit: number,
 *     ticketsWithoutCost: number,
 *     netCash: number,
 *     netValue: number,
 *     collectionRate: number
 *   }>,
 *   currencies: string[],
 *   totalTickets: number,
 *   totalSales: number,
 *   totalCollected: number,
 *   totalOutstanding: number,
 *   totalRefunds: number,
 *   totalModFees: number,
 *   totalNetProfit: number,
 *   grossProfit: number,
 *   ticketsWithoutCost: number,
 *   modificationCollected: number,
 *   modificationOutstanding: number,
 *   netCash: number,
 *   netValue: number,
 *   collectionRate: number,
 *   currency: string,
 *   isCalculated: boolean
 * }}
 */
export function aggregateLedgers(tickets = []) {
  const byCurrency = {};

  const ensureCurrency = (curr) => {
    if (!byCurrency[curr]) {
      byCurrency[curr] = {
        currency: curr,
        totalTickets: 0,
        activeTickets: 0,
        salesDec: asDecimal(0),
        collectedDec: asDecimal(0),
        outstandingDec: asDecimal(0),
        refundsDec: asDecimal(0),
        pendingRefundsDec: asDecimal(0),
        modificationFeesDec: asDecimal(0),
        modificationCollectedDec: asDecimal(0),
        modificationOutstandingDec: asDecimal(0),
        modificationProfitDec: asDecimal(0),
        grossProfitDec: asDecimal(0),
        ticketsWithoutCost: 0
      };
    }
    return byCurrency[curr];
  };

  if (Array.isArray(tickets)) {
    for (const t of tickets) {
      const ledger = computeTicketLedger(t);
      const curr = ledger.currency;
      const group = ensureCurrency(curr);

      group.totalTickets += 1;
      const status = (t.status || '').toUpperCase();
      const isCancelledOrRefunded = status === 'CANCELLED' || status === 'REFUNDED';

      if (!isCancelledOrRefunded) {
        group.activeTickets += 1;
        // Sales defined once = ticket price of active tickets
        group.salesDec = group.salesDec.plus(asDecimal(t.ticketPrice || 0));
        group.outstandingDec = group.outstandingDec.plus(asDecimal(ledger.remaining));
      }

      // Collected and refunds stay gross
      group.collectedDec = group.collectedDec.plus(asDecimal(ledger.totalPaid));
      group.refundsDec = group.refundsDec.plus(asDecimal(ledger.totalRefunded));
      group.pendingRefundsDec = group.pendingRefundsDec.plus(asDecimal(ledger.pendingRefunds));

      // Modification totals
      group.modificationFeesDec = group.modificationFeesDec.plus(asDecimal(ledger.modificationFees));
      group.modificationCollectedDec = group.modificationCollectedDec.plus(asDecimal(ledger.modificationPaid));
      group.modificationOutstandingDec = group.modificationOutstandingDec.plus(asDecimal(ledger.modificationOutstanding));
      group.modificationProfitDec = group.modificationProfitDec.plus(asDecimal(ledger.modificationProfit));

      // Profit rules:
      // costPrice null => profit null; excluded from profit totals and counted in ticketsWithoutCost
      if (ledger.netProfit === null) {
        group.ticketsWithoutCost += 1;
      } else {
        group.grossProfitDec = group.grossProfitDec.plus(asDecimal(ledger.netProfit));
      }
    }
  }

  // If no tickets, ensure default EGP group exists
  if (Object.keys(byCurrency).length === 0) {
    ensureCurrency('EGP');
  }

  const finalizedByCurrency = {};
  const currencies = Object.keys(byCurrency);

  for (const curr of currencies) {
    const g = byCurrency[curr];
    const sales = moneyNumber(g.salesDec);
    const collected = moneyNumber(g.collectedDec);
    const outstanding = moneyNumber(g.outstandingDec);
    const refunds = moneyNumber(g.refundsDec);
    const pendingRefunds = moneyNumber(g.pendingRefundsDec);
    const modificationFees = moneyNumber(g.modificationFeesDec);
    const modificationCollected = moneyNumber(g.modificationCollectedDec);
    const modificationOutstanding = moneyNumber(g.modificationOutstandingDec);
    const modificationProfit = moneyNumber(g.modificationProfitDec);
    const grossProfit = moneyNumber(g.grossProfitDec);

    // netCash = collected + modificationCollected - refunds
    const netCash = moneyNumber(
      g.collectedDec.plus(g.modificationCollectedDec).minus(g.refundsDec)
    );

    // netValue = sales - refunds
    const netValue = moneyNumber(
      Decimal.max(0, g.salesDec.minus(g.refundsDec))
    );

    // collectionRate on active tickets: collected / sales
    const collectionRate = g.salesDec.greaterThan(0)
      ? Math.round(g.collectedDec.dividedBy(g.salesDec).times(100).toNumber())
      : 0;

    finalizedByCurrency[curr] = {
      currency: curr,
      totalTickets: g.totalTickets,
      activeTickets: g.activeTickets,
      sales,
      totalSales: sales,
      collected,
      totalCollected: collected,
      outstanding,
      totalOutstanding: outstanding,
      refunds,
      totalRefunds: refunds,
      pendingRefunds,
      modificationFees,
      totalModFees: modificationFees,
      modificationCollected,
      modificationOutstanding,
      modificationProfit,
      grossProfit,
      totalNetProfit: grossProfit,
      ticketsWithoutCost: g.ticketsWithoutCost,
      netCash,
      netValue,
      collectionRate
    };
  }

  // Primary currency bucket for backward compatibility
  const primaryCurr = currencies[0] || 'EGP';
  const primary = finalizedByCurrency[primaryCurr];

  return {
    byCurrency: finalizedByCurrency,
    currencies,
    totalTickets: Object.values(finalizedByCurrency).reduce((s, g) => s + g.totalTickets, 0),
    totalSales: primary.sales,
    totalCollected: primary.collected,
    totalOutstanding: primary.outstanding,
    totalRefunds: primary.refunds,
    totalModFees: primary.modificationFees,
    totalNetProfit: primary.grossProfit, // alias for backwards compat
    grossProfit: primary.grossProfit,
    ticketsWithoutCost: primary.ticketsWithoutCost,
    modificationCollected: primary.modificationCollected,
    modificationOutstanding: primary.modificationOutstanding,
    netCash: primary.netCash,
    netValue: primary.netValue,
    collectionRate: primary.collectionRate,
    currency: primary.currency,
    isCalculated: true
  };
}
