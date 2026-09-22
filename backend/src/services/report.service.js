/**
 * AfricaTravel - Business Intelligence & Report Service
 *
 * Computes executive KPIs, revenue trends, airline performance, and financial analytics.
 */

import Decimal from 'decimal.js';
import { getPrismaClient } from '../config/database.js';
import { computeTicketLedger, aggregateLedgers, isModificationPayment } from '../domain/ledger.js';
import { calculateTotalPaid, calculateTotalRefunded } from '../domain/ticket-rules.js';
import { asDecimal, moneyNumber } from '../utils/money.js';
import { EmployeeService } from './employee.service.js';

/**
 * Computes weekly revenue trends from ticket and payment records
 * @param {Array<object>} tickets
 * @returns {Array<object>}
 */
export function computeWeeklyTrends(tickets = []) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return [];
  }

  const now = new Date();
  const weeks = [];

  // Determine all currencies across tickets
  const currencySet = new Set();
  tickets.forEach(t => {
    if (t.currency) currencySet.add(t.currency);
  });
  const allCurrencies = currencySet.size > 0 ? Array.from(currencySet) : ['EGP'];

  // Generate 4 rolling 7-day intervals ending at current time
  for (let i = 3; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startLabel = `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()}`;
    const weekIndex = 4 - i;

    const byCurrencyData = {};
    const ensureCurrData = (curr) => {
      if (!byCurrencyData[curr]) {
        byCurrencyData[curr] = {
          currency: curr,
          salesTotal: asDecimal(0),
          collectionsTotal: asDecimal(0),
          modificationCollectionsTotal: asDecimal(0),
          refundsTotal: asDecimal(0),
          grossProfitTotal: asDecimal(0),
          outstandingTotal: asDecimal(0)
        };
      }
      return byCurrencyData[curr];
    };

    allCurrencies.forEach(c => ensureCurrData(c));

    tickets.forEach(t => {
      const curr = t.currency || 'EGP';
      const group = ensureCurrData(curr);
      const ledger = computeTicketLedger(t);
      const ticketDate = new Date(t.createdAt || t.departureDate);
      const status = (t.status || '').toUpperCase();
      const isCancelledOrRefunded = status === 'CANCELLED' || status === 'REFUNDED';

      // Sales in window (active tickets only)
      if (ticketDate >= start && ticketDate < end && !isCancelledOrRefunded) {
        group.salesTotal = group.salesTotal.plus(asDecimal(t.ticketPrice || 0));
        if (ledger.netProfit !== null) {
          const costPriceDec = asDecimal(t.costPrice || 0);
          group.grossProfitTotal = group.grossProfitTotal.plus(asDecimal(t.ticketPrice || 0).minus(costPriceDec));
        }
      }

      // Modification profit attributed to modification date
      if (Array.isArray(t.modifications)) {
        t.modifications.forEach(m => {
          const mDate = new Date(m.date || m.createdAt);
          if (mDate >= start && mDate < end) {
            const mChangeFee = asDecimal(m.changeFee || 0);
            const mAirlineFee = asDecimal(m.airlineFee || 0);
            group.grossProfitTotal = group.grossProfitTotal.plus(mChangeFee.minus(mAirlineFee));
          }
        });
      }

      // Collections in window (ticket payments vs modification payments)
      if (Array.isArray(t.payments)) {
        t.payments.forEach(p => {
          const pDate = new Date(p.date || p.createdAt);
          if (pDate >= start && pDate < end) {
            const pAmt = asDecimal(p.amount || 0);
            if (isModificationPayment(p)) {
              group.modificationCollectionsTotal = group.modificationCollectionsTotal.plus(pAmt);
            } else {
              group.collectionsTotal = group.collectionsTotal.plus(pAmt);
            }
          }
        });
      }

      // Refunds in window
      if (Array.isArray(t.refunds)) {
        t.refunds.forEach(r => {
          const rStatus = (r.status || '').toUpperCase();
          if (rStatus === 'COMPLETED' || rStatus === 'REFUNDED' || rStatus === 'APPROVED') {
            const rDate = new Date(r.processedDate || r.requestedDate || r.createdAt);
            if (rDate >= start && rDate < end) {
              group.refundsTotal = group.refundsTotal.plus(asDecimal(r.amount || 0));
            }
          }
        });
      }

      // Outstanding snapshot at window end:
      // Active ticket created before or at window end: price minus payments made up to window end
      if (ticketDate <= end && !isCancelledOrRefunded) {
        let paidUpToEnd = asDecimal(0);
        if (Array.isArray(t.payments)) {
          t.payments.forEach(p => {
            const pDate = new Date(p.date || p.createdAt);
            if (pDate <= end && !isModificationPayment(p)) {
              paidUpToEnd = paidUpToEnd.plus(asDecimal(p.amount || 0));
            }
          });
        }
        const remAtEnd = Decimal.max(0, asDecimal(t.ticketPrice || 0).minus(paidUpToEnd));
        group.outstandingTotal = group.outstandingTotal.plus(remAtEnd);
      }
    });

    const finalizedByCurrency = {};
    for (const [curr, d] of Object.entries(byCurrencyData)) {
      finalizedByCurrency[curr] = {
        currency: curr,
        sales: moneyNumber(d.salesTotal),
        collections: moneyNumber(d.collectionsTotal),
        modificationCollections: moneyNumber(d.modificationCollectionsTotal),
        totalCollections: moneyNumber(d.collectionsTotal.plus(d.modificationCollectionsTotal)),
        refunds: moneyNumber(d.refundsTotal),
        outstanding: moneyNumber(d.outstandingTotal),
        grossProfit: moneyNumber(d.grossProfitTotal),
        netProfit: moneyNumber(d.grossProfitTotal)
      };
    }

    const primaryCurr = allCurrencies[0] || 'EGP';
    const primary = finalizedByCurrency[primaryCurr] || {
      sales: 0,
      collections: 0,
      modificationCollections: 0,
      totalCollections: 0,
      refunds: 0,
      outstanding: 0,
      grossProfit: 0,
      netProfit: 0
    };

    weeks.push({
      label: `${startLabel}-${end.getDate()}`,
      week: `W${weekIndex}`,
      sales: primary.sales,
      collections: primary.collections,
      modificationCollections: primary.modificationCollections,
      totalCollections: primary.totalCollections || (primary.collections + primary.modificationCollections),
      refunds: primary.refunds,
      outstanding: primary.outstanding,
      netProfit: primary.grossProfit,
      grossProfit: primary.grossProfit,
      currency: primaryCurr,
      byCurrency: finalizedByCurrency
    });
  }

  return weeks;
}

export const ReportService = {
  /**
   * Computes high-level Executive KPIs
   * @param {Array<object>} [preloadedTickets=null] - Optional preloaded tickets array to prevent duplicate queries
   */
  async getSummaryKPIs(preloadedTickets = null) {
    const prisma = getPrismaClient();
    const tickets = preloadedTickets || await prisma.ticket.findMany({
      where: { deletedAt: null },
      include: {
        payments: true,
        modifications: true,
        refunds: true
      }
    });

    const kpis = aggregateLedgers(tickets);

    // Compute archivedUnrefundedBalance from soft-deleted tickets (C9)
    let archivedUnrefundedDec = asDecimal(0);
    const archivedByCurrency = {};

    if (prisma?.ticket?.findMany) {
      try {
        const archivedTickets = await prisma.ticket.findMany({
          where: { deletedAt: { not: null } },
          include: { payments: true, refunds: true }
        });
        for (const at of archivedTickets) {
          const atCurr = at.currency || 'EGP';
          const atPaid = calculateTotalPaid(at.payments || []);
          const atRefunded = calculateTotalRefunded(at.refunds || []);
          const atUnref = Decimal.max(0, asDecimal(atPaid).minus(asDecimal(atRefunded)));
          archivedUnrefundedDec = archivedUnrefundedDec.plus(atUnref);
          archivedByCurrency[atCurr] = (archivedByCurrency[atCurr] || asDecimal(0)).plus(atUnref);
        }
      } catch {
        // Fallback for mock environments / offline tests
      }
    }

    kpis.archivedUnrefundedBalance = moneyNumber(archivedUnrefundedDec);
    kpis.archivedUnrefundedByCurrency = Object.fromEntries(
      Object.entries(archivedByCurrency).map(([k, v]) => [k, moneyNumber(v)])
    );

    // Compute totalExpenses from Office Expenses (Phase D)
    let totalExpensesDec = asDecimal(0);
    const expensesByCurrency = {};

    if (prisma?.expense?.findMany) {
      try {
        const expenses = await prisma.expense.findMany({
          where: { deletedAt: null },
          select: { amount: true, currency: true }
        });
        for (const exp of expenses) {
          const curr = exp.currency || 'EGP';
          const amt = asDecimal(exp.amount || 0);
          totalExpensesDec = totalExpensesDec.plus(amt);
          expensesByCurrency[curr] = (expensesByCurrency[curr] || asDecimal(0)).plus(amt);
        }
      } catch {
        // Fallback for mock environments / offline tests
      }
    }

    // Attach expenses and compute netProfit = grossProfit - expenses per currency
    for (const curr of Object.keys(kpis.byCurrency)) {
      const expDec = expensesByCurrency[curr] || asDecimal(0);
      const grossDec = asDecimal(kpis.byCurrency[curr].grossProfit);
      kpis.byCurrency[curr].totalExpenses = moneyNumber(expDec);
      kpis.byCurrency[curr].netProfit = moneyNumber(grossDec.minus(expDec));
    }

    const primaryCurr = kpis.currency || 'EGP';
    const primaryExpensesDec = expensesByCurrency[primaryCurr] || asDecimal(0);
    const primaryGrossDec = asDecimal(kpis.grossProfit);
    const primaryNetProfitDec = primaryGrossDec.minus(primaryExpensesDec);

    kpis.totalExpenses = moneyNumber(primaryExpensesDec);
    kpis.netProfit = moneyNumber(primaryNetProfitDec);
    kpis.totalNetProfit = kpis.grossProfit; // Keep old field name for backward compatibility

    return kpis;
  },

  /**
   * Computes airline market share and refund metrics
   * @param {Array<object>} [preloadedTickets=null] - Optional preloaded tickets array to prevent duplicate queries
   */
  async getAirlinePerformance(preloadedTickets = null) {
    const prisma = getPrismaClient();
    const tickets = preloadedTickets || await prisma.ticket.findMany({
      where: { deletedAt: null },
      include: {
        payments: true,
        refunds: true,
        modifications: true
      }
    });

    if (tickets.length === 0) {
      return [];
    }

    const airlineMap = {};
    tickets.forEach(t => {
      const airline = t.airline || 'Unknown';
      if (!airlineMap[airline]) {
        airlineMap[airline] = {
          airline,
          airlineCode: t.airlineCode || 'XX',
          ticketsSold: 0,
          totalRevenueDec: asDecimal(0),
          totalRefundedDec: asDecimal(0),
          totalNetProfitDec: asDecimal(0),
          ticketsWithoutCost: 0
        };
      }
      airlineMap[airline].ticketsSold += 1;

      const ledger = computeTicketLedger(t);
      const status = (t.status || '').toUpperCase();
      if (status !== 'CANCELLED' && status !== 'REFUNDED') {
        airlineMap[airline].totalRevenueDec = airlineMap[airline].totalRevenueDec.plus(asDecimal(t.ticketPrice || 0));
      }
      airlineMap[airline].totalRefundedDec = airlineMap[airline].totalRefundedDec.plus(asDecimal(ledger.totalRefunded));
      if (ledger.netProfit !== null) {
        airlineMap[airline].totalNetProfitDec = airlineMap[airline].totalNetProfitDec.plus(asDecimal(ledger.netProfit));
      } else {
        airlineMap[airline].ticketsWithoutCost += 1;
      }
    });

    const results = Object.values(airlineMap).map(a => {
      const totalRevenue = moneyNumber(a.totalRevenueDec);
      const totalRefunded = moneyNumber(a.totalRefundedDec);
      const totalNetProfit = moneyNumber(a.totalNetProfitDec);
      const rate = a.totalRevenueDec.greaterThan(0)
        ? a.totalRefundedDec.dividedBy(a.totalRevenueDec).times(100).toFixed(1) + '%'
        : '0.0%';
      return {
        airline: a.airline,
        airlineCode: a.airlineCode,
        ticketsSold: a.ticketsSold,
        totalRevenue,
        totalRefunded,
        totalNetProfit,
        grossProfit: totalNetProfit,
        refundRate: rate,
        isFallback: false
      };
    });

    results.sort((a, b) => b.ticketsSold - a.ticketsSold);
    return results;
  },

  /**
   * Computes revenue trends & financial distributions
   */
  async getRevenueTrends() {
    const prisma = getPrismaClient();
    const tickets = await prisma.ticket.findMany({
      where: { deletedAt: null },
      include: {
        payments: true,
        refunds: true,
        modifications: true
      }
    });

    const [kpis, weeklyTrends] = await Promise.all([
      this.getSummaryKPIs(tickets),
      computeWeeklyTrends(tickets)
    ]);

    return {
      kpis,
      weeklyTrends
    };
  },

  /**
   * Builds the comprehensive operational report
   */
  async getFullReport() {
    const prisma = getPrismaClient();
    const [employeePerformance, tickets] = await Promise.all([
      EmployeeService.getEmployees(),
      prisma.ticket.findMany({
        where: { deletedAt: null },
        include: {
          payments: true,
          refunds: true,
          modifications: true
        }
      })
    ]);

    const [kpis, airlinePerformance] = await Promise.all([
      this.getSummaryKPIs(tickets),
      this.getAirlinePerformance(tickets)
    ]);

    const weeklyTrends = computeWeeklyTrends(tickets);

    return {
      kpis,
      airlinePerformance,
      employeePerformance,
      weeklyTrends
    };
  },

  /**
   * Per-ticket customer payment breakdown: who paid how much, how much
   * remains, and their trip type.
   */
  async getCustomerPayments() {
    const prisma = getPrismaClient();
    const tickets = await prisma.ticket.findMany({
      where: { deletedAt: null },
      include: {
        payments: true,
        modifications: true,
        refunds: true,
        customer: true
      },
      orderBy: {
        customer: { name: 'asc' }
      }
    });

    const rows = tickets.map(t => {
      const ledger = computeTicketLedger(t);
      const price = moneyNumber(asDecimal(t.ticketPrice));
      const totalCollectedFromCustomer = moneyNumber(asDecimal(ledger.totalPaid).plus(asDecimal(ledger.modificationPaid)));
      const totalRemainingFromCustomer = moneyNumber(asDecimal(ledger.remaining).plus(asDecimal(ledger.modificationOutstanding)));

      return {
        ticketId: t.id,
        ticketNumber: t.ticketNumber || t.id,
        customerId: t.customerId,
        customerName: t.customer?.name || t.passengerName || 'Unknown',
        ticketPrice: price,
        ticketPaid: ledger.totalPaid,
        totalPaid: totalCollectedFromCustomer,
        totalRemaining: totalRemainingFromCustomer,
        tripType: t.tripType || 'One Way',
        modificationFees: ledger.modificationFees,
        modificationPaid: ledger.modificationPaid,
        modificationOutstanding: ledger.modificationOutstanding,
        currency: ledger.currency
      };
    });

    rows.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return rows;
  }
};
