/**
 * AfricaTravel - Audit Activity Controller
 */

import { AuditService } from '../services/audit.service.js';

export const AuditController = {
  async getLogs(req, res, next) {
    try {
      const result = await AuditService.getLogs(req.query);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
