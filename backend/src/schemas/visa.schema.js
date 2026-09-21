/**
 * AfricaTravel — Visa Request Validation Schemas
 */

import { z } from 'zod';
import { money } from './common.schema.js';

const validDateString = z.string().trim().min(1, 'Date is required').max(50)
  .refine(val => !isNaN(new Date(val).getTime()), {
    message: 'Invalid date format'
  });

const optionalValidDateString = z.string().max(50).optional()
  .refine(val => !val || !isNaN(new Date(val).getTime()), {
    message: 'Invalid date format'
  });

const visaTypes = ['TOURIST', 'WORK', 'STUDY', 'UMRAH_HAJJ', 'MEDICAL'];
const paymentStatuses = ['PAID', 'UNPAID'];

export const createVisaSchema = z.object({
  clientName: z.string().trim().min(1, 'Client name is required').max(200, 'Client name is too long'),
  phone: z.string().max(30).optional(),
  visaType: z.enum(visaTypes, {
    errorMap: () => ({ message: 'Invalid visa type' })
  }),
  country: z.string().trim().min(1, 'Country is required').max(100, 'Country is too long'),
  submissionDate: validDateString,
  price: money({ positive: true }),
  costPrice: money({ positive: true }).optional(),
  currency: z.string().max(10).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  notes: z.string().max(1000).optional()
});

export const queryVisasSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  visaType: z.enum(visaTypes).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  search: z.string().optional(),
  startDate: optionalValidDateString,
  endDate: optionalValidDateString
});

export const updateVisaSchema = z.object({
  clientName: z.string().trim().min(1).max(200).optional(),
  phone: z.string().max(30).optional(),
  visaType: z.enum(visaTypes).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  submissionDate: validDateString.optional(),
  price: money({ positive: true }).optional(),
  costPrice: money({ positive: true }).optional(),
  currency: z.string().max(10).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  notes: z.string().max(1000).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});
