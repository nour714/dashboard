/**
 * AfricaTravel - Business Intelligence & Report Service
 *
 * Computes executive KPIs, revenue trends, airline performance, and financial analytics.
 */

import { getPrismaClient } from '../config/database.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalRefunded,
  calculateNetValue,
  calculateTotalModificationFees,
  calculateNetProfit
} from '../domain/ticket-rules.js';
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
    const endLabel = `${end.toLocaleString('default', { month: 'short' })} ${end.getDate()}`;
    const weekIndex = 4 - i;

    let sales = 0;
    let collections = 0;
    let refunds = 0;
    let netProfit = 0;

    tickets.forEach(t => {
      const ticketDate = new Date(t.createdAt || t.departureDate);
      if (ticketDate >= start && ticketDate < end) {
        sales += (Number(t.ticketPrice) || 0);
        const profit = calculateNetProfit(t.ticketPrice, t.costPrice);
        if (profit !== null) {
          netProfit += profit;
        }
      }

      if (Array.isArray(t.payments)) {
        t.payments.forEach(p => {
          const pDate = new Date(p.date || p.createdAt);
          if (pDate >= start && pDate < end) {
            collections += (Number(p.amount) || 0);
          }
        });
      }

      if (Array.isArray(t.refunds)) {
        t.refunds.forEach(r => {
          if (r.status === 'COMPLETED' || r.status === 'Refunded' || r.status === 'APPROVED') {
            const rDate = new Date(r.processedDate || r.requestedDate || r.createdAt);
            if (rDate >= start && rDate < end) {
              refunds += (Number(r.amount) || 0);
            }
          }
        });
      }
    });

    const outstanding = Math.max(0, sales - collections);

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
    let totalSales = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalRefunds = 0;
    let totalModFees = 0;
    let totalNetProfit = 0;

    tickets.forEach(t => {
      const price = Number(t.ticketPrice) || 0;
      totalSales += price;
      const paid = calculateTotalPaid(t.payments || []);
      totalCollected += paid;
      totalOutstanding += calculateRemaining(price, paid);
      totalRefunds += calculateTotalRefunded(t.refunds || []);
      totalModFees += calculateTotalModificationFees(t.modifications || []);
      const profit = calculateNetProfit(t.ticketPrice, t.costPrice);
      if (profit !== null) {
        totalNetProfit += profit;
      }
    });

    const netValue = calculateNetValue(totalSales, totalModFees, totalRefunds);
    const collectionRate = totalSales > 0 ? Math.round((totalCollected / totalSales) * 100) : 0;

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
          totalRevenue: 0,
          totalRefunded: 0,
          totalNetProfit: 0
        };
      }
      airlineMap[airline].ticketsSold += 1;
      airlineMap[airline].totalRevenue += (Number(t.ticketPrice) || 0);
      airlineMap[airline].totalRefunded += calculateTotalRefunded(t.refunds || []);
      const profit = calculateNetProfit(t.ticketPrice, t.costPrice);
      if (profit !== null) {
        airlineMap[airline].totalNetProfit += profit;
      }
    });

    const results = Object.values(airlineMap).map(a => {
      const rate = a.totalRevenue > 0
        ? ((a.totalRefunded / a.totalRevenue) * 100).toFixed(1) + '%'
        : '0.0%';
      return {
        ...a,
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
      const price = Number(t.ticketPrice) || 0;
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
