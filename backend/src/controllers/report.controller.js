/**
 * AfricaTravel - Business Intelligence & Reports Controller
 */

import { ReportService } from '../services/report.service.js';

export const ReportController = {
  async getSummary(req, res, next) {
    try {
      const kpis = await ReportService.getSummaryKPIs();
      const isAdmin = req.user?.role === 'ADMIN';
      const data = isAdmin
        ? kpis
        : { ...kpis, totalNetProfit: undefined };
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
          kpis: revenue.kpis ? { ...revenue.kpis, totalNetProfit: undefined } : revenue.kpis,
          weeklyTrends: Array.isArray(revenue.weeklyTrends)
            ? revenue.weeklyTrends.map(w => {
                const rest = { ...w };
                delete rest.netProfit;
                return rest;
              })
            : revenue.weeklyTrends
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
          kpis: report.kpis ? { ...report.kpis, totalNetProfit: undefined } : report.kpis,
          airlinePerformance: Array.isArray(report.airlinePerformance)
            ? report.airlinePerformance.map(a => {
                const rest = { ...a };
                delete rest.totalNetProfit;
                return rest;
              })
            : report.airlinePerformance,
          employeePerformance: report.employeePerformance,
          weeklyTrends: Array.isArray(report.weeklyTrends)
            ? report.weeklyTrends.map(w => {
                const rest = { ...w };
                delete rest.netProfit;
                return rest;
              })
            : report.weeklyTrends
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
