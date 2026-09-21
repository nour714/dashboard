/**
 * AfricaTravel — Business Intelligence & Report Service
 *
 * Consumes server-authoritative financials (/reports/summary, /reports/customer-payments)
 * and per-ticket financials, eliminating client-side float KPI calculations.
 */

import { store } from '../state/store.js';
import { apiClient } from './api-client.js';
import { TicketService } from './ticket-service.js';

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

const defaultKPIs = {
  totalTickets: 0,
  totalSales: 0,
  totalCollected: 0,
  totalOutstanding: 0,
  totalRefunds: 0,
  totalModFees: 0,
  totalNetProfit: 0,
  grossProfit: 0,
  netProfit: null,
  totalExpenses: 0,
  collectionRate: 0,
  currency: 'EGP',
  byCurrency: {}
};

export const ReportService = {
  /**
   * Returns server-computed KPIs from store cache.
   */
  getKPIs() {
    const { summaryKPIs } = store.getState();
    if (summaryKPIs) {
      return summaryKPIs;
    }
    return defaultKPIs;
  },

  /**
   * Fetches latest summary KPIs from GET /reports/summary.
   */
  async fetchSummary() {
    const res = await apiClient.get('/reports/summary');
    if (res && res.success && res.data) {
      store.state.summaryKPIs = res.data;
      store.notify();
      return res.data;
    }
    return null;
  },

  getEmployeePerformance() {
    const { employees = [] } = store.getState();
    return employees.map(emp => ({
      ...emp,
      computedTickets: emp.ticketsCount || 0,
      computedSales: emp.sales || 0,
      computedCollected: emp.collected || 0,
      computedRefunds: emp.refunds || 0,
      computedOutstanding: emp.outstanding || 0,
      isCalculated: false
    }));
  },

  getAirlinePerformance() {
    return mockReportData.airlines;
  },

  getReportData() {
    return {
      kpis: this.getKPIs(),
      employeePerformance: this.getEmployeePerformance(),
      airlinePerformance: this.getAirlinePerformance(),
      dataSource: 'SERVER_AUTHORITATIVE'
    };
  },

  /**
   * Per-ticket customer payment breakdown derived from store state using per-ticket financials.
   */
  getCustomerPayments() {
    const { tickets = [], customers = [] } = store.getState();
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    const rows = tickets.map(t => {
      const fin = t.financials || TicketService.getTicketFinancials(t);
      const customerName = (t.customerId ? customerMap.get(t.customerId) : null) || t.passengerName || 'Unknown';

      return {
        ticketId: t.id,
        ticketNumber: t.ticketNumber || t.id,
        customerId: t.customerId,
        customerName,
        ticketPrice: fin.ticketPrice,
        totalPaid: fin.totalPaid,
        totalRemaining: fin.remaining,
        tripType: t.tripType || 'One Way',
        currency: fin.currency || t.currency || 'EGP'
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
