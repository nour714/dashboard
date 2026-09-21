/**
 * AfricaTravel — Visas Controller
 */

import { VisaService } from '../services/visa.service.js';

const sanitizeVisaForRole = (visa, role) => {
  if (!visa) return visa;
  if (role === 'ADMIN') return visa;
  
  if (Array.isArray(visa)) {
    return visa.map(v => {
      const { costPrice, ...rest } = v;
      return rest;
    });
  }
  
  const { costPrice, ...rest } = visa;
  return rest;
};

export const VisaController = {
  async createVisa(req, res, next) {
    try {
      const visa = await VisaService.createVisa(req.body, req.user);
      const sanitized = sanitizeVisaForRole(visa, req.user?.role);
      return res.status(201).json({
        success: true,
        data: sanitized
      });
    } catch (err) {
      next(err);
    }
  },

  async getVisas(req, res, next) {
    try {
      const result = await VisaService.getVisas(req.query, req.user);
      const sanitizedVisas = sanitizeVisaForRole(result.visas, req.user?.role);
      
      // Also sanitize totals if not admin
      let totals = result.totals;
      if (req.user?.role !== 'ADMIN') {
        totals = { ...totals };
        delete totals.totalCostPrice;
        if (totals.byCurrency) {
          Object.keys(totals.byCurrency).forEach(curr => {
            delete totals.byCurrency[curr].totalCostPrice;
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: sanitizedVisas,
        pagination: result.pagination,
        totals: totals
      });
    } catch (err) {
      next(err);
    }
  },

  async getVisaById(req, res, next) {
    try {
      const visa = await VisaService.getVisaById(req.params.id, req.user);
      const sanitized = sanitizeVisaForRole(visa, req.user?.role);
      return res.status(200).json({
        success: true,
        data: sanitized
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteVisa(req, res, next) {
    try {
      await VisaService.deleteVisa(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: 'Visa deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  },

  async updateVisa(req, res, next) {
    try {
      const updated = await VisaService.updateVisa(req.params.id, req.body, req.user);
      const sanitized = sanitizeVisaForRole(updated, req.user?.role);
      return res.status(200).json({
        success: true,
        data: sanitized
      });
    } catch (err) {
      next(err);
    }
  }
};
