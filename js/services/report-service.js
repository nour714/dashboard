/**
 * AfricaTravel — Business Intelligence & Report Service
 *
 * Enforces explicit separation between dynamic calculated report data derived
 * from application state and mock/demo fallback data.
 */

import { store } from '../state/store.js';
import { apiClient } from './api-client.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalRefunded,
  calculateNetValue,
  calculateTotalModificationFees
} from '../domain/ticket-rules.js';

/**
 * Static mock fallback data used strictly when no state records exist.
 */
export const mockReportData = {
  airlines: [
    { airline: 'Emirates', airlineCode: 'EK', ticketsSold: 185, totalRevenue: 520000, refundRate: '1.2%', isFallback: true },
    { airline: 'Qatar Airways', airlineCode: 'QR', ticketsSold: 142, totalRevenue: 390500, refundRate: '2.4%', isFallback: true },
    { airline: 'EgyptAir', airlineCode: 'MS', ticketsSold: 210, totalRevenue: 410000, refundRate: '3.1%', isFallback: true },
    { airline: 'Turkish Airlines', airlineCode: 'TK', ticketsSold: 98, totalRevenue: 285000, refundRate: '1.8%', isFallback: true },
    { airline: 'Lufthansa', airlineCode: 'LH', ticketsSold: 89, totalRevenue: 185200, refundRate: '5.8%', isFallback: true },
    { airline: 'British Airways', airlineCode: 'BA', ticketsSold: 76, totalRevenue: 144300, refundRate: '8.1%', isFallback: true }
  ],
  weeklyTrends: [
    { label: 'Oct 1-7', week: 'W1', sales: 110000, collections: 95000, refunds: 4000, outstanding: 15000 },
    { label: 'Oct 8-14', week: 'W2', sales: 140000, collections: 125000, refunds: 6000, outstanding: 15000 },
    { label: 'Oct 15-21', week: 'W3', sales: 160000, collections: 145000, refunds: 7000, outstanding: 15000 },
    { label: 'Oct 22-31', week: 'W4', sales: 130000, collections: 130000, refunds: 3000, outstanding: 0 }
  ]
};

/**
 * Computes all business intelligence metrics dynamically from live state tickets and employees.
 * @param {Array<object>} tickets
 * @param {Array<object>} employees
 * @returns {object}
 */
export function buildReportFromTickets(tickets = [], employees = []) {
  let totalTickets = tickets.length;
  let totalSales = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalRefunds = 0;
  let totalModFees = 0;

  tickets.forEach(t => {
    const price = Number(t.ticketPrice) || 0;
    totalSales += price;
    const paid = calculateTotalPaid(t.payments);
    totalCollected += paid;
    totalOutstanding += calculateRemaining(price, paid);
    totalRefunds += calculateTotalRefunded(t.refunds);
    totalModFees += calculateTotalModificationFees(t.modifications);
  });

  const netValue = calculateNetValue(totalSales, totalModFees, totalRefunds);
  const collectionRate = totalSales > 0 ? Math.round((totalCollected / totalSales) * 100) : 0;

  const kpis = {
    totalTickets,
    totalSales,
    totalCollected,
    totalOutstanding,
    totalRefunds,
    totalModFees,
    netValue,
    collectionRate,
    isCalculated: true
  };

  // Employee Performance: Computed dynamically from state tickets
  const employeePerformance = employees.map(emp => {
    const empTickets = tickets.filter(t => t.createdBy === emp.name || t.createdById === emp.id);
    let sales = 0;
    let collected = 0;
    let refunds = 0;
    let outstanding = 0;

    empTickets.forEach(t => {
      const p = Number(t.ticketPrice) || 0;
      sales += p;
      const paid = calculateTotalPaid(t.payments);
      collected += paid;
      outstanding += calculateRemaining(p, paid);
      refunds += calculateTotalRefunded(t.refunds);
    });

    const hasStateTickets = empTickets.length > 0;

    return {
      ...emp,
      computedTickets: hasStateTickets ? empTickets.length : (emp.ticketsCount || 0),
      computedSales: hasStateTickets ? sales : (emp.sales || 0),
      computedCollected: hasStateTickets ? collected : (emp.collected || 0),
      computedRefunds: hasStateTickets ? refunds : (emp.refunds || 0),
      computedOutstanding: hasStateTickets ? outstanding : (emp.outstanding || 0),
      isCalculated: hasStateTickets
    };
  });

  // Airline Performance: Computed dynamically from state tickets
  const airlineMap = {};
  tickets.forEach(t => {
    const airline = t.airline || 'Unknown';
    if (!airlineMap[airline]) {
      airlineMap[airline] = {
        airline,
        airlineCode: t.airlineCode || 'XX',
        ticketsSold: 0,
        totalRevenue: 0,
        totalRefunded: 0
      };
    }
    airlineMap[airline].ticketsSold += 1;
    airlineMap[airline].totalRevenue += (Number(t.ticketPrice) || 0);
    airlineMap[airline].totalRefunded += calculateTotalRefunded(t.refunds);
  });

  const calculatedAirlines = Object.values(airlineMap).map(a => {
    const rate = a.totalRevenue > 0 ? ((a.totalRefunded / a.totalRevenue) * 100).toFixed(1) + '%' : '0.0%';
    return {
      ...a,
      refundRate: rate,
      isFallback: false
    };
  });

  // Sort airlines by tickets sold descending
  calculatedAirlines.sort((a, b) => b.ticketsSold - a.ticketsSold);

  const airlinePerformance = calculatedAirlines.length > 0 ? calculatedAirlines : mockReportData.airlines;

  return {
    kpis,
    employeePerformance,
    airlinePerformance,
    dataSource: tickets.length > 0 ? 'APPLICATION_STATE' : 'DEMO_FALLBACK'
  };
}

export const ReportService = {
  getKPIs() {
    const { tickets, employees } = store.getState();
    return buildReportFromTickets(tickets, employees).kpis;
  },

  getEmployeePerformance() {
    const { tickets, employees } = store.getState();
    return buildReportFromTickets(tickets, employees).employeePerformance;
  },

  getAirlinePerformance() {
    const { tickets, employees } = store.getState();
    return buildReportFromTickets(tickets, employees).airlinePerformance;
  },

  getReportData() {
    const { tickets, employees } = store.getState();
    return buildReportFromTickets(tickets, employees);
  },

  /**
   * Per-ticket customer payment breakdown derived from store state
   */
  getCustomerPayments() {
    const { tickets = [], customers = [] } = store.getState();
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    const rows = tickets.map(t => {
      const price = Number(t.ticketPrice) || 0;
      const paid = calculateTotalPaid(t.payments || []);
      const remaining = calculateRemaining(price, paid);
      const customerName = (t.customerId ? customerMap.get(t.customerId) : null) || t.passengerName || 'Unknown';

      return {
        ticketId: t.id,
        ticketNumber: t.ticketNumber || t.id,
        customerId: t.customerId,
        customerName,
        ticketPrice: price,
        totalPaid: paid,
        totalRemaining: remaining,
        tripType: t.tripType || 'One Way'
      };
    });

    rows.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return rows;
  },

  /**
   * Fetches customer payments breakdown directly from backend API endpoint
   */
  async fetchCustomerPayments() {
    return await apiClient.get('/reports/customer-payments');
  }
};
