/**
 * AfricaTravel - System Settings Validation Schema
 */

import { z } from 'zod';

export const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(100).optional(),
  defaultCurrency: z.string().trim().min(2).max(10).optional(),
  supportedCurrencies: z.array(z.string().trim().min(2).max(10)).min(1).max(20).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  enableAuditLogs: z.boolean().optional(),
  contactEmail: z.string().trim().email().max(100).nullable().optional(),
  contactPhone: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  taxNumber: z.string().trim().max(50).nullable().optional(),
  licenseNumber: z.string().trim().max(50).nullable().optional(),
  sessionTimeout: z.coerce.number().int().min(5).max(1440).optional(),
  twoFactorEnabled: z.boolean().optional(),
  flightReminders: z.boolean().optional(),
  soundAlerts: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  brandColor: z.string().trim().max(50).optional()
}).strict();
