/**
 * AfricaTravel - Business Intelligence & Report Service
 *
 * Computes executive KPIs, revenue trends, airline performance, and financial analytics.
 */

import Decimal from 'decimal.js';
import { getPrismaClient } from '../config/database.js';
import { computeTicketLedger, aggregateLedgers, isModificationPayment } from '../domain/ledger.js';
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

  // Generate 4 rolling 7-day intervals ending at current time
  for (let i = 3; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startLabel = `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()}`;
    const weekIndex = 4 - i;

    let salesTotal = asDecimal(0);
    let collectionsTotal = asDecimal(0);
    let modificationCollectionsTotal = asDecimal(0);
    let refundsTotal = asDecimal(0);
    let grossProfitTotal = asDecimal(0);
    let outstandingTotal = asDecimal(0);

    tickets.forEach(t => {
      const ledger = computeTicketLedger(t);
      const ticketDate = new Date(t.createdAt || t.departureDate);
      const status = (t.status || '').toUpperCase();
      const isCancelledOrRefunded = status === 'CANCELLED' || status === 'REFUNDED';

      // Sales in window (active tickets only)
      if (ticketDate >= start && ticketDate < end && !isCancelledOrRefunded) {
        salesTotal = salesTotal.plus(asDecimal(t.ticketPrice || 0));
        if (ledger.netProfit !== null) {
          const costPriceDec = asDecimal(t.costPrice || 0);
          grossProfitTotal = grossProfitTotal.plus(asDecimal(t.ticketPrice || 0).minus(costPriceDec));
        }
      }

      // Modification profit attributed to modification date
      if (Array.isArray(t.modifications)) {
        t.modifications.forEach(m => {
          const mDate = new Date(m.date || m.createdAt);
          if (mDate >= start && mDate < end) {
            const mChangeFee = asDecimal(m.changeFee || 0);
            const mAirlineFee = asDecimal(m.airlineFee || 0);
            grossProfitTotal = grossProfitTotal.plus(mChangeFee.minus(mAirlineFee));
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
              modificationCollectionsTotal = modificationCollectionsTotal.plus(pAmt);
            } else {
              collectionsTotal = collectionsTotal.plus(pAmt);
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
              refundsTotal = refundsTotal.plus(asDecimal(r.amount || 0));
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
        outstandingTotal = outstandingTotal.plus(remAtEnd);
      }
    });

    const sales = moneyNumber(salesTotal);
    const collections = moneyNumber(collectionsTotal);
    const modificationCollections = moneyNumber(modificationCollectionsTotal);
    const refunds = moneyNumber(refundsTotal);
    const outstanding = moneyNumber(outstandingTotal);
    const grossProfit = moneyNumber(grossProfitTotal);

    weeks.push({
      label: `${startLabel}-${end.getDate()}`,
      week: `W${weekIndex}`,
      sales,
      collections,
      modificationCollections,
      refunds,
      outstanding,
      netProfit: grossProfit,
      grossProfit
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

    return aggregateLedgers(tickets);
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

      return {
        ticketId: t.id,
        ticketNumber: t.ticketNumber || t.id,
        customerId: t.customerId,
        customerName: t.customer?.name || t.passengerName || 'Unknown',
        ticketPrice: price,
        totalPaid: ledger.totalPaid,
        totalRemaining: ledger.remaining,
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
