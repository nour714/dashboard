/**
 * AfricaTravel - Settings Controller
 */

import { getPrismaClient } from '../config/database.js';
import { AuditService } from '../services/audit.service.js';

export const SettingController = {
  async getSettings(req, res, next) {
    try {
      const prisma = getPrismaClient();
      const setting = await prisma.systemSetting.findUnique({
        where: { id: 'default' }
      });

      return res.status(200).json({
        success: true,
        data: setting?.data || {}
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      const prisma = getPrismaClient();
      const existing = await prisma.systemSetting.findUnique({
        where: { id: 'default' }
      });

      const currentData = existing?.data && typeof existing.data === 'object' ? existing.data : {};
      const mergedData = {
        ...currentData,
        ...req.body
      };

      const updated = await prisma.systemSetting.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          data: mergedData
        },
        update: {
          data: mergedData
        }
      });

      await AuditService.recordLog({
        user: req.user?.name || 'Admin',
        userId: req.user?.id,
        action: 'UPDATE_SETTINGS',
        description: `User ${req.user?.name || 'Admin'} updated system settings.`
      });

      return res.status(200).json({
        success: true,
        data: updated.data
      });
    } catch (err) {
      next(err);
    }
  }
};
