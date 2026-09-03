/**
 * AfricaTravel - Business Intelligence & Report Service
 *
 * Computes executive KPIs, revenue trends, airline performance, and financial analytics.
 */

import Decimal from 'decimal.js';
import { getPrismaClient } from '../config/database.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalRefunded,
  calculateNetValue,
  calculateTotalModificationFees,
  calculateNetProfit
} from '../domain/ticket-rules.js';
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

  // Find range of dates in tickets / payments
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
    let refundsTotal = asDecimal(0);
    let netProfitTotal = asDecimal(0);

    tickets.forEach(t => {
      const ticketDate = new Date(t.createdAt || t.departureDate);
      if (ticketDate >= start && ticketDate < end) {
        salesTotal = salesTotal.plus(asDecimal(t.ticketPrice));
        const profit = calculateNetProfit(t.ticketPrice, t.costPrice);
        if (profit !== null) {
          netProfitTotal = netProfitTotal.plus(asDecimal(profit));
        }
      }

      if (Array.isArray(t.payments)) {
        t.payments.forEach(p => {
          const pDate = new Date(p.date || p.createdAt);
          if (pDate >= start && pDate < end) {
            collectionsTotal = collectionsTotal.plus(asDecimal(p.amount));
          }
        });
      }

      if (Array.isArray(t.refunds)) {
        t.refunds.forEach(r => {
          if (r.status === 'COMPLETED' || r.status === 'Refunded' || r.status === 'APPROVED') {
            const rDate = new Date(r.processedDate || r.requestedDate || r.createdAt);
            if (rDate >= start && rDate < end) {
              refundsTotal = refundsTotal.plus(asDecimal(r.amount));
            }
          }
        });
      }
    });

    const sales = moneyNumber(salesTotal);
    const collections = moneyNumber(collectionsTotal);
    const refunds = moneyNumber(refundsTotal);
    const netProfit = moneyNumber(netProfitTotal);
    const outstanding = moneyNumber(Decimal.max(0, salesTotal.minus(collectionsTotal)));

    weeks.push({
      label: `${startLabel}-${end.getDate()}`,
      week: `W${weekIndex}`,
      sales,
      collections,
      refunds,
      outstanding,
      netProfit
    });
  }

  return weeks;
}

export const ReportService = {
  /**
   * Computes high-level Executive KPIs
   */
  async getSummaryKPIs() {
    const prisma = getPrismaClient();
    const tickets = await prisma.ticket.findMany({
      where: { deletedAt: null },
      include: {
        payments: true,
        modifications: true,
        refunds: true
      }
    });

    let totalTickets = tickets.length;
    let totalSalesDec = asDecimal(0);
    let totalCollectedDec = asDecimal(0);
    let totalOutstandingDec = asDecimal(0);
    let totalRefundsDec = asDecimal(0);
    let totalModFeesDec = asDecimal(0);
    let totalNetProfitDec = asDecimal(0);

    tickets.forEach(t => {
      const price = asDecimal(t.ticketPrice);
      totalSalesDec = totalSalesDec.plus(price);
      const paid = asDecimal(calculateTotalPaid(t.payments || []));
      totalCollectedDec = totalCollectedDec.plus(paid);
      totalOutstandingDec = totalOutstandingDec.plus(asDecimal(calculateRemaining(t.ticketPrice, paid)));
      totalRefundsDec = totalRefundsDec.plus(asDecimal(calculateTotalRefunded(t.refunds || [])));
      totalModFeesDec = totalModFeesDec.plus(asDecimal(calculateTotalModificationFees(t.modifications || [])));
      const profit = calculateNetProfit(t.ticketPrice, t.costPrice);
      if (profit !== null) {
        totalNetProfitDec = totalNetProfitDec.plus(asDecimal(profit));
      }
    });

    const totalSales = moneyNumber(totalSalesDec);
    const totalCollected = moneyNumber(totalCollectedDec);
    const totalOutstanding = moneyNumber(totalOutstandingDec);
    const totalRefunds = moneyNumber(totalRefundsDec);
    const totalModFees = moneyNumber(totalModFeesDec);
    const totalNetProfit = moneyNumber(totalNetProfitDec);

    const netValue = calculateNetValue(totalSales, totalModFees, totalRefunds);
    const collectionRate = totalSalesDec.greaterThan(0)
      ? Math.round(totalCollectedDec.dividedBy(totalSalesDec).times(100).toNumber())
      : 0;

    return {
      totalTickets,
      totalSales,
      totalCollected,
      totalOutstanding,
      totalRefunds,
      totalModFees,
      totalNetProfit,
      netValue,
      collectionRate,
      isCalculated: true
    };
  },

  /**
   * Computes airline market share and refund metrics
   */
  async getAirlinePerformance() {
    const prisma = getPrismaClient();
    const tickets = await prisma.ticket.findMany({
      where: { deletedAt: null },
      include: {
        refunds: true
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
          totalNetProfitDec: asDecimal(0)
        };
      }
      airlineMap[airline].ticketsSold += 1;
      airlineMap[airline].totalRevenueDec = airlineMap[airline].totalRevenueDec.plus(asDecimal(t.ticketPrice));
      airlineMap[airline].totalRefundedDec = airlineMap[airline].totalRefundedDec.plus(asDecimal(calculateTotalRefunded(t.refunds || [])));
      const profit = calculateNetProfit(t.ticketPrice, t.costPrice);
      if (profit !== null) {
        airlineMap[airline].totalNetProfitDec = airlineMap[airline].totalNetProfitDec.plus(asDecimal(profit));
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
    const [kpis, tickets] = await Promise.all([
      this.getSummaryKPIs(),
      prisma.ticket.findMany({
        where: { deletedAt: null },
        include: {
          payments: true,
          refunds: true
        }
      })
    ]);

    const weeklyTrends = computeWeeklyTrends(tickets);

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
    const [kpis, airlinePerformance, employeePerformance, tickets] = await Promise.all([
      this.getSummaryKPIs(),
      this.getAirlinePerformance(),
      EmployeeService.getEmployees(),
      prisma.ticket.findMany({
        where: { deletedAt: null },
        include: {
          payments: true,
          refunds: true
        }
      })
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
        customer: true
      },
      orderBy: {
        customer: { name: 'asc' }
      }
    });

    const rows = tickets.map(t => {
      const price = moneyNumber(asDecimal(t.ticketPrice));
      const paid = calculateTotalPaid(t.payments || []);
      const remaining = calculateRemaining(price, paid);

      return {
        ticketId: t.id,
        ticketNumber: t.ticketNumber || t.id,
        customerId: t.customerId,
        customerName: t.customer?.name || t.passengerName || 'Unknown',
        ticketPrice: price,
        totalPaid: paid,
        totalRemaining: remaining,
        tripType: t.tripType || 'One Way'
      };
    });

    // Secondary safe sort by customerName in case customer is null/fallback
    rows.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return rows;
  }
};

