/**
 * AfricaTravel - Settings Controller
 */

import { getPrismaClient } from '../config/database.js';
import { AuditService } from '../services/audit.service.js';

export const SettingController = {
  async getSettings(req, res, next) {
    try {
      const prisma = getPrismaClient();
      let setting = null;
      try {
        if (prisma.systemSetting && typeof prisma.systemSetting.findUnique === 'function') {
          setting = await prisma.systemSetting.findUnique({
            where: { id: 'default' }
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ Could not fetch system settings from DB, returning defaults:', dbErr.message);
      }

      const defaultSettings = {
        companyName: 'AfricaTravel',
        defaultCurrency: 'EGP',
        supportedCurrencies: ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'],
        timezone: 'Africa/Cairo',
        enableAuditLogs: true
      };

      return res.status(200).json({
        success: true,
        data: setting?.data || defaultSettings
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      const prisma = getPrismaClient();
      let currentData = {};
      try {
        if (prisma.systemSetting && typeof prisma.systemSetting.findUnique === 'function') {
          const existing = await prisma.systemSetting.findUnique({
            where: { id: 'default' }
          });
          currentData = existing?.data && typeof existing.data === 'object' ? existing.data : {};
        }
      } catch (_) {}

      const mergedData = {
        ...currentData,
        ...req.body
      };

      let updatedData = mergedData;
      if (prisma.systemSetting && typeof prisma.systemSetting.upsert === 'function') {
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
        updatedData = updated.data;
      }

      await AuditService.recordLog({
        user: req.user?.name || 'Admin',
        userId: req.user?.id,
        action: 'UPDATE_SETTINGS',
        description: `User ${req.user?.name || 'Admin'} updated system settings.`
      });

      return res.status(200).json({
        success: true,
        data: updatedData
      });
    } catch (err) {
      next(err);
    }
  }
};
