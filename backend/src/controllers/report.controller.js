/**
 * AfricaTravel - Business Intelligence & Reports Controller
 */

import { ReportService } from '../services/report.service.js';

function sanitizeKPIs(kpis) {
  if (!kpis) return kpis;
  const sanitized = { ...kpis };
  delete sanitized.totalNetProfit;
  delete sanitized.grossProfit;
  delete sanitized.netProfit;
  delete sanitized.totalExpenses;
  delete sanitized.modificationProfit;

  if (sanitized.byCurrency) {
    const cleanedByCurrency = {};
    for (const [curr, grp] of Object.entries(sanitized.byCurrency)) {
      const cleaned = { ...grp };
      delete cleaned.grossProfit;
      delete cleaned.netProfit;
      delete cleaned.totalExpenses;
      delete cleaned.modificationProfit;
      cleanedByCurrency[curr] = cleaned;
    }
    sanitized.byCurrency = cleanedByCurrency;
  }
  return sanitized;
}

function sanitizeWeeklyTrends(weeklyTrends) {
  if (!Array.isArray(weeklyTrends)) return weeklyTrends;
  return weeklyTrends.map(w => {
    const rest = { ...w };
    delete rest.netProfit;
    delete rest.grossProfit;
    delete rest.totalExpenses;
    if (rest.byCurrency) {
      const cleanedByCurr = {};
      for (const [c, val] of Object.entries(rest.byCurrency)) {
        const cVal = { ...val };
        delete cVal.netProfit;
        delete cVal.grossProfit;
        delete cVal.totalExpenses;
        cleanedByCurr[c] = cVal;
      }
      rest.byCurrency = cleanedByCurr;
    }
    return rest;
  });
}

function sanitizeEmployee(emp) {
  if (!emp) return emp;
  const sanitized = { ...emp };
  delete sanitized.grossProfit;
  delete sanitized.netProfit;
  delete sanitized.totalNetProfit;
  delete sanitized.modificationProfit;
  if (sanitized.byCurrency) {
    const cleanedByCurrency = {};
    for (const [curr, grp] of Object.entries(sanitized.byCurrency)) {
      const cleanedGrp = { ...grp };
      delete cleanedGrp.grossProfit;
      delete cleanedGrp.netProfit;
      delete cleanedGrp.modificationProfit;
      cleanedByCurrency[curr] = cleanedGrp;
    }
    sanitized.byCurrency = cleanedByCurrency;
  }
  return sanitized;
}

export const ReportController = {
  async getSummary(req, res, next) {
    try {
      const kpis = await ReportService.getSummaryKPIs();
      const isAdmin = req.user?.role === 'ADMIN';
      const data = isAdmin ? kpis : sanitizeKPIs(kpis);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getRevenue(req, res, next) {
    try {
      const revenue = await ReportService.getRevenueTrends();
      const isAdmin = req.user?.role === 'ADMIN';
      let data = revenue;
      if (!isAdmin) {
        data = {
          kpis: sanitizeKPIs(revenue.kpis),
          weeklyTrends: sanitizeWeeklyTrends(revenue.weeklyTrends)
        };
      }
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getAirlines(req, res, next) {
    try {
      const airlines = await ReportService.getAirlinePerformance();
      const isAdmin = req.user?.role === 'ADMIN';
      const data = isAdmin
        ? airlines
        : airlines.map(a => {
            const rest = { ...a };
            delete rest.totalNetProfit;
            delete rest.grossProfit;
            delete rest.netProfit;
            delete rest.airlineFee;
            delete rest.airlineRefundAmount;
            return rest;
          });
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getFullReport(req, res, next) {
    try {
      const report = await ReportService.getFullReport();
      const isAdmin = req.user?.role === 'ADMIN';
      let data = report;
      if (!isAdmin) {
        data = {
          kpis: sanitizeKPIs(report.kpis),
          airlinePerformance: Array.isArray(report.airlinePerformance)
            ? report.airlinePerformance.map(a => {
                const rest = { ...a };
                delete rest.totalNetProfit;
                delete rest.grossProfit;
                delete rest.netProfit;
                delete rest.airlineFee;
                delete rest.airlineRefundAmount;
                return rest;
              })
            : report.airlinePerformance,
          employeePerformance: Array.isArray(report.employeePerformance)
            ? report.employeePerformance.map(sanitizeEmployee)
            : report.employeePerformance,
          weeklyTrends: sanitizeWeeklyTrends(report.weeklyTrends)
        };
      }
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getCustomerPayments(req, res, next) {
    try {
      const rows = await ReportService.getCustomerPayments();
      return res.status(200).json({
        success: true,
        data: rows
      });
    } catch (err) {
      next(err);
    }
  }
};
