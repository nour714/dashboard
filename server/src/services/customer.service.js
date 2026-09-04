/**
 * AfricaTravel - Customer CRM Service
 *
 * Manages customer directory, note threads, and dynamic lifetime financial accounting.
 */

import { getPrismaClient } from '../config/database.js';
import { calculateTotalPaid, calculateRemaining, calculateTotalRefunded } from '../domain/ticket-rules.js';
import { asDecimal, moneyNumber } from '../utils/money.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';
import { enrichTicketFinancials } from './ticket.service.js';
import crypto from 'crypto';

export const CustomerService = {
  /**
   * Retrieves all customers matching an optional search query with optional pagination
   * @param {string} query
   * @param {object|boolean} [options={}]
   */
  async getCustomers(query = '', options = {}) {
    const prisma = getPrismaClient();
    const includeDeleted = typeof options === 'boolean' ? options : Boolean(options.includeDeleted);
    const where = {};

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { passport: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } }
      ];
    }

    const isPaginated = options && typeof options === 'object' && (options.page !== undefined || options.limit !== undefined);
    if (isPaginated) {
      const page = Math.max(1, Number(options.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
      const skip = (page - 1) * limit;

      const [total, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        })
      ]);

      return {
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    return prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Retrieves customer by ID with full lifetime statistical breakdown
   * @param {string} customerId
   * @param {boolean} includeDeleted
   */
  async getCustomerById(customerId, includeDeleted = false) {
    if (!customerId) return null;
    const prisma = getPrismaClient();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        notes: { orderBy: { date: 'desc' } },
        tickets: {
          include: {
            payments: true,
            modifications: true,
            refunds: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) return null;
    if (!includeDeleted && customer.deletedAt !== null) return null;

    let totalSpentDec = asDecimal(0);
    let totalPaidDec = asDecimal(0);
    let totalRefundedDec = asDecimal(0);
    let totalOutstandingDec = asDecimal(0);

    const enrichedTickets = (customer.tickets || []).map(t => {
      const enriched = enrichTicketFinancials(t);
      const price = asDecimal(t.ticketPrice);
      const paid = asDecimal(calculateTotalPaid(t.payments || []));
      const ref = asDecimal(calculateTotalRefunded(t.refunds || []));
      const rem = asDecimal(calculateRemaining(t.ticketPrice, paid));

      totalSpentDec = totalSpentDec.plus(price);
      totalPaidDec = totalPaidDec.plus(paid);
      totalRefundedDec = totalRefundedDec.plus(ref);
      totalOutstandingDec = totalOutstandingDec.plus(rem);

      return enriched;
    });

    return {
      ...customer,
      stats: {
        ticketCount: enrichedTickets.length,
        totalSpent: moneyNumber(totalSpentDec),
        totalPaid: moneyNumber(totalPaidDec),
        totalRefunded: moneyNumber(totalRefundedDec),
        totalOutstanding: moneyNumber(totalOutstandingDec)
      },
      tickets: enrichedTickets
    };
  },

  /**
   * Creates a new customer record
   * @param {object} data
   * @param {object} currentUser
   */
  async createCustomer(data, currentUser = {}) {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Customer name is required', 'name');
    }

    const prisma = getPrismaClient();
    const cleanPassport = data.passport ? data.passport.trim() : null;

    if (cleanPassport) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          passport: cleanPassport,
          deletedAt: { not: null }
        }
      });
      if (duplicate) {
        throw new BusinessRuleError('Passport already exists in an archived customer record', 'DUPLICATE_PASSPORT', 409);
      }
    }

    const newId = `CUST-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    let newCustomer;
    try {
      newCustomer = await prisma.customer.create({
        data: {
          id: newId,
          name: data.name.trim(),
          email: data.email ? data.email.trim() : null,
          phone: data.phone ? data.phone.trim() : null,
          passport: cleanPassport,
          nationality: data.nationality || 'Egyptian (EGY)',
          isVip: Boolean(data.isVip),
          memberSince: String(new Date().getFullYear()),
          notes: data.initialNote && data.initialNote.trim() ? {
            create: {
              author: currentUser.name || 'Agent',
              text: data.initialNote.trim(),
              date: new Date()
            }
          } : undefined
        },
        include: {
          notes: true
        }
      });
    } catch (err) {
      if (err.code === 'P2002') {
        const archived = await prisma.customer.findFirst({ where: { passport: cleanPassport, deletedAt: { not: null } } });
        throw new BusinessRuleError(archived ? 'Passport already exists in an archived customer record' : 'Passport number already exists', 'DUPLICATE_PASSPORT', 409);
      }
      throw err;
    }

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'CREATE_CUSTOMER',
      customerId: newCustomer.id,
      description: `Created new customer record for ${newCustomer.name} (${newCustomer.id}).`
    });

    return newCustomer;
  },

  /**
   * Updates an existing customer profile
   * @param {string} customerId
   * @param {object} updates
   * @param {object} currentUser
   */
  async updateCustomer(customerId, updates, currentUser = {}) {
    const prisma = getPrismaClient();
    const existing = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!existing) {
      throw new NotFoundError('Customer', customerId);
    }

    const data = {};
    if (updates.name !== undefined) data.name = updates.name.trim();
    if (updates.email !== undefined) data.email = updates.email ? updates.email.trim() : null;
    if (updates.phone !== undefined) data.phone = updates.phone ? updates.phone.trim() : null;
    if (updates.passport !== undefined) {
      const cleanPassport = updates.passport ? updates.passport.trim() : null;
      if (cleanPassport && cleanPassport !== existing.passport) {
        const duplicate = await prisma.customer.findFirst({
          where: {
            passport: cleanPassport,
            deletedAt: { not: null },
            id: { not: customerId }
          }
        });
        if (duplicate) {
          throw new BusinessRuleError('Passport already exists in an archived customer record', 'DUPLICATE_PASSPORT', 409);
        }
      }
      data.passport = cleanPassport;
    }
    if (updates.nationality !== undefined) data.nationality = updates.nationality;
    if (updates.isVip !== undefined) data.isVip = Boolean(updates.isVip);

    let updated;
    try {
      updated = await prisma.customer.update({
        where: { id: customerId },
        data,
        include: {
          notes: { orderBy: { date: 'desc' } }
        }
      });
    } catch (err) {
      if (err.code === 'P2002') {
        const archived = data.passport
          ? await prisma.customer.findFirst({ where: { passport: data.passport, deletedAt: { not: null }, id: { not: customerId } } })
          : null;
        throw new BusinessRuleError(archived ? 'Passport already exists in an archived customer record' : 'Passport number already exists', 'DUPLICATE_PASSPORT', 409);
      }
      throw err;
    }

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'UPDATE_CUSTOMER',
      customerId,
      description: `Updated profile details for customer ${updated.name} (${updated.id}).`
    });

    return updated;
  },

  /**
   * Adds a CRM note to a customer profile
   * @param {string} customerId
   * @param {string} text
   * @param {object} currentUser
   */
  async addNote(customerId, text, currentUser = {}) {
    if (!text || !text.trim()) {
      throw new ValidationError('Note text cannot be empty', 'text');
    }

    const prisma = getPrismaClient();
    const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    const note = await prisma.customerNote.create({
      data: {
        customerId,
        author: currentUser.name || 'Agent',
        text: text.trim(),
        date: new Date()
      }
    });

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'UPDATE_CUSTOMER',
      customerId,
      description: `Added note to customer ${customer.name}.`
    });

    return note;
  },

  /**
   * Upload or replace a passport document for a customer
   * @param {string} customerId
   * @param {Buffer} buffer - file buffer from multer
   * @param {string} reportedMimeType - client-reported mimetype
   * @param {object} currentUser
   * @returns {Promise<{uploadedAt: Date}>}
   */
  async uploadPassportDocument(customerId, buffer, reportedMimeType, currentUser = {}) {
    const prisma = getPrismaClient();
    const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    // Defensive size check (multer already caps at 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!buffer || buffer.length === 0) {
      throw new ValidationError('File is empty', 'passportDocument');
    }
    if (buffer.length > MAX_SIZE) {
      throw new ValidationError('File size exceeds the 5MB limit', 'passportDocument');
    }

    // Magic-byte sniffing — do not trust client-reported mimetype alone
    const { fileTypeFromBuffer } = await import('file-type');
    const detectedType = await fileTypeFromBuffer(buffer);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!detectedType || !ALLOWED_TYPES.includes(detectedType.mime)) {
      throw new ValidationError(
        'Invalid file content. Only JPEG, PNG, and PDF files are allowed.',
        'passportDocument'
      );
    }

    // Determine extension from the real (sniffed) MIME type
    const { randomUUID } = await import('crypto');
    const ext = detectedType.mime === 'application/pdf' ? 'pdf'
      : (detectedType.mime === 'image/png' ? 'png' : 'jpg');
    const storagePath = `customers/${customerId}/passport-${randomUUID()}.${ext}`;
    const oldDocPath = customer.passportDocPath;

    // 1. Upload new document to Supabase Storage (private bucket)
    const { uploadToStorage, deleteFromStorage } = await import('../config/storage.js');
    const { error: uploadError } = await uploadToStorage(storagePath, buffer, detectedType.mime);
    if (uploadError) {
      throw new ValidationError(
        `Storage upload failed: ${uploadError.message}`,
        'passportDocument'
      );
    }

    // 2. Update customer record with new storage path (with compensating cleanup if DB update fails)
    const uploadedAt = new Date();
    try {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          passportDocPath: storagePath,
          passportDocUploadedAt: uploadedAt
        }
      });
    } catch (dbErr) {
      // Compensating action: remove newly uploaded file to avoid orphan files
      await deleteFromStorage(storagePath).catch(cleanupErr => {
        console.warn(`[CustomerService] Failed compensating cleanup for ${storagePath}:`, cleanupErr.message);
      });
      throw dbErr;
    }

    // 3. Delete old document only after new file is uploaded and DB is safely updated
    if (oldDocPath) {
      await deleteFromStorage(oldDocPath).catch(deleteErr => {
        console.warn(`[CustomerService] Failed to delete old passport doc ${oldDocPath}:`, deleteErr.message);
      });
    }

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'UPLOAD_CUSTOMER_PASSPORT_DOC',
      customerId,
      description: `Uploaded passport document for customer ${customer.name} (${customerId}).`
    });

    return { uploadedAt };
  },

  /**
   * Get a short-lived signed URL for the customer's passport document
   * @param {string} customerId
   * @returns {Promise<{url: string, expiresAt: string}>}
   */
  async getPassportDocumentUrl(customerId, currentUser = {}, requestMeta = {}) {
    const prisma = getPrismaClient();
    const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!customer || !customer.passportDocPath) {
      throw new NotFoundError('Passport document', customerId);
    }

    const { createSignedUrl } = await import('../config/storage.js');
    const { data, error } = await createSignedUrl(customer.passportDocPath, 300);
    if (error || !data?.signedUrl) {
      throw new ValidationError(
        `Failed to generate signed URL: ${error?.message || 'Unknown error'}`,
        'passportDocument'
      );
    }

    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();
    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'PASSPORT_DOCUMENT_VIEWED',
      customerId,
      description: `Generated a signed passport document URL for ${customer.name} (${customerId}).`,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent
    });
    return { url: data.signedUrl, expiresAt };
  },

  /**
   * Delete a customer's passport document (ADMIN only — enforced at route level)
   * @param {string} customerId
   * @param {object} currentUser
   */
  async deletePassportDocument(customerId, currentUser = {}) {
    const prisma = getPrismaClient();
    const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!customer || !customer.passportDocPath) {
      throw new NotFoundError('Passport document', customerId);
    }

    // Delete from Supabase Storage
    const { deleteFromStorage } = await import('../config/storage.js');
    await deleteFromStorage(customer.passportDocPath);

    // Clear the database fields
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        passportDocPath: null,
        passportDocUploadedAt: null
      }
    });

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'DELETE_CUSTOMER_PASSPORT_DOC',
      customerId,
      description: `Deleted passport document for customer ${customer.name} (${customerId}).`
    });
  },

  /**
   * Soft-deletes a customer (ADMIN only), verifies no active tickets, and preserves documents for retention
   * @param {string} customerId
   * @param {object} currentUser
   */
  async deleteCustomer(customerId, currentUser = {}) {
    const prisma = getPrismaClient();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer || customer.deletedAt !== null) {
      throw new NotFoundError('Customer', customerId);
    }

    // Check for active tickets associated with this customer
    const activeTickets = await prisma.ticket.findMany({
      where: {
        customerId,
        deletedAt: null,
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      }
    });

    if (activeTickets && activeTickets.length > 0) {
      throw new BusinessRuleError(
        'Cannot delete customer with active tickets. Please cancel or refund all active tickets before deleting the customer.',
        'CUSTOMER_HAS_ACTIVE_TICKETS',
        { customerId, activeTicketCount: activeTickets.length, activeTicketIds: activeTickets.map(t => t.id) }
      );
    }

    const executeDeletion = async (tx) => {
      const now = new Date();
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          deletedAt: now
        }
      });

      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        try {
          await tx.auditLog.create({
            data: {
              id: `ACT-${crypto.randomUUID()}`,
              user: currentUser.name || 'Admin',
              userId: currentUser.id || null,
              action: 'DELETE_CUSTOMER',
              customerId: customer.id,
              description: `Admin ${currentUser.name || 'Admin'} deleted customer ${customer.name} (${customer.id}).`,
              metadata: {
                adminId: currentUser.id,
                targetId: customer.id,
                targetType: 'CUSTOMER',
                customerName: customer.name,
                passportDocPreserved: !!customer.passportDocPath,
                softDeleted: true
              }
            }
          });
        } catch (_) {}
      }

      return updated;
    };

    let result;
    if (typeof prisma.$transaction === 'function') {
      result = await prisma.$transaction(executeDeletion);
    } else {
      result = await executeDeletion(prisma);
    }

    return {
      id: result.id,
      name: result.name,
      deletedAt: result.deletedAt
    };
  },

  /**
   * Permanently purges (hard-deletes) a customer (ADMIN only) after verifying:
   * 1. Customer has already been soft-deleted (deletedAt != null)
   * 2. Customer has zero associated tickets in the entire system (including cancelled/soft-deleted)
   * 3. Double confirmation matches customer ID
   * 4. Cleans up stored passport documents and notes
   * @param {string} customerId
   * @param {object} currentUser
   * @param {string} confirmCustomerId
   */
  async purgeCustomer(customerId, currentUser = {}, confirmCustomerId) {
    if (!customerId) {
      throw new ValidationError('Customer ID is required', 'customerId');
    }

    const prisma = getPrismaClient();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    if (!customer.deletedAt) {
      throw new BusinessRuleError(
        'Customer must be soft-deleted before they can be permanently purged.',
        'CUSTOMER_NOT_SOFT_DELETED',
        { customerId: customer.id }
      );
    }

    // Check for any tickets referencing this customer (active, cancelled, or soft-deleted)
    const ticketCount = await prisma.ticket.count({
      where: { customerId: customer.id }
    });

    if (ticketCount > 0) {
      throw new BusinessRuleError(
        'Cannot permanently purge customer with existing ticket history. Tickets must be purged first or retained for audit compliance.',
        'CUSTOMER_HAS_TICKET_HISTORY',
        { customerId: customer.id, ticketCount }
      );
    }

    if (!confirmCustomerId || confirmCustomerId.trim() !== customer.id) {
      throw new ValidationError(
        `Confirmation failed: confirmCustomerId must match the exact customer ID '${customer.id}'.`,
        'confirmCustomerId',
        { expected: customer.id, received: confirmCustomerId }
      );
    }

    // If customer has a stored passport document, delete it from storage
    if (customer.passportDocPath) {
      try {
        const { deleteFromStorage } = await import('../config/storage.js');
        await deleteFromStorage(customer.passportDocPath);
      } catch (err) {
        console.warn('Could not delete passport doc from storage during purge:', err.message);
      }
    }

    const executePurge = async (tx) => {
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        try {
          await tx.auditLog.create({
            data: {
              id: `ACT-${crypto.randomUUID()}`,
              user: currentUser.name || 'Admin',
              userId: currentUser.id || null,
              action: 'PURGE_CUSTOMER',
              customerId: customer.id,
              description: `Permanently purged customer ${customer.name} (${customer.id}).`,
              metadata: {
                adminId: currentUser.id,
                targetId: customer.id,
                targetType: 'CUSTOMER',
                customerName: customer.name,
                passport: customer.passport,
                email: customer.email,
                phone: customer.phone,
                passportDocDeleted: !!customer.passportDocPath,
                purgedAt: new Date().toISOString()
              }
            }
          });
        } catch (_) {}
      }

      if (tx.customerNote && typeof tx.customerNote.deleteMany === 'function') {
        await tx.customerNote.deleteMany({
          where: { customerId: customer.id }
        });
      }

      await tx.customer.delete({
        where: { id: customer.id }
      });

      return { id: customer.id, purged: true };
    };

    let result;
    if (typeof prisma.$transaction === 'function') {
      result = await prisma.$transaction(executePurge);
    } else {
      result = await executePurge(prisma);
    }

    return result;
  }
};
