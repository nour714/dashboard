/**
 * AfricaTravel - Audit Activity Controller
 */

import { AuditService } from '../services/audit.service.js';

/**
 * Sanitizes audit log entries for non-admin roles (removes IP, UserAgent, and sensitive metadata)
 * @param {object} log
 * @param {string} [role]
 * @returns {object}
 */
export function sanitizeAuditLogForRole(log, role) {
  if (!log) return log;
  if (role === 'ADMIN') return log;

  const sanitized = { ...log };
  delete sanitized.ip;
  delete sanitized.userAgent;

  if (sanitized.metadata && typeof sanitized.metadata === 'object') {
    const metaCopy = { ...sanitized.metadata };
    delete metaCopy.ip;
    delete metaCopy.userAgent;
    delete metaCopy.headers;
    delete metaCopy.costPrice;
    delete metaCopy.netProfit;
    sanitized.metadata = metaCopy;
  }

  return sanitized;
}

export const AuditController = {
  async getLogs(req, res, next) {
    try {
      const result = await AuditService.getLogs(req.query);
      if (req.user?.role !== 'ADMIN' && Array.isArray(result?.logs)) {
        result.logs = result.logs.map(log => sanitizeAuditLogForRole(log, req.user?.role));
      }
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
