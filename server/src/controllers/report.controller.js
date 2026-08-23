/**
 * AfricaTravel - Business Intelligence & Reports Controller
 */

import { ReportService } from '../services/report.service.js';

export const ReportController = {
  async getSummary(req, res, next) {
    try {
      const kpis = await ReportService.getSummaryKPIs();
      return res.status(200).json({
        success: true,
        data: kpis
      });
    } catch (err) {
      next(err);
    }
  },

  async getRevenue(req, res, next) {
    try {
      const revenue = await ReportService.getRevenueTrends();
      return res.status(200).json({
        success: true,
        data: revenue
      });
    } catch (err) {
      next(err);
    }
  },

  async getAirlines(req, res, next) {
    try {
      const airlines = await ReportService.getAirlinePerformance();
      return res.status(200).json({
        success: true,
        data: airlines
      });
    } catch (err) {
      next(err);
    }
  },

  async getFullReport(req, res, next) {
    try {
      const report = await ReportService.getFullReport();
      return res.status(200).json({
        success: true,
        data: report
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
