/**
 * AfricaTravel - Customer CRM Service
 *
 * Manages customer directory, note threads, and dynamic lifetime financial accounting.
 */

import { getPrismaClient } from '../config/database.js';
import { calculateTotalPaid, calculateRemaining, calculateTotalRefunded } from '../domain/ticket-rules.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';
import { enrichTicketFinancials } from './ticket.service.js';
import crypto from 'crypto';

export const CustomerService = {
  /**
   * Retrieves all customers matching an optional search query
   * @param {string} query
   * @param {boolean} includeDeleted
   */
  async getCustomers(query = '', includeDeleted = false) {
    const prisma = getPrismaClient();
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

    return prisma.customer.findMany({
      where,
      include: {
        notes: { orderBy: { date: 'desc' } }
      },
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

    let totalSpent = 0;
    let totalPaid = 0;
    let totalRefunded = 0;
    let totalOutstanding = 0;

    const enrichedTickets = (customer.tickets || []).map(t => {
      const enriched = enrichTicketFinancials(t);
      const price = Number(t.ticketPrice) || 0;
      const paid = calculateTotalPaid(t.payments || []);
      const ref = calculateTotalRefunded(t.refunds || []);

      totalSpent += price;
      totalPaid += paid;
      totalRefunded += ref;
      totalOutstanding += calculateRemaining(price, paid);

      return enriched;
    });

    return {
      ...customer,
      stats: {
        ticketCount: enrichedTickets.length,
        totalSpent,
        totalPaid,
        totalRefunded,
        totalOutstanding
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
    const newId = `CUST-${Math.floor(8900 + Math.random() * 1000)}`;

    const newCustomer = await prisma.customer.create({
      data: {
        id: newId,
        name: data.name.trim(),
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        passport: data.passport ? data.passport.trim() : null,
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
    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) {
      throw new NotFoundError('Customer', customerId);
    }

    const data = {};
    if (updates.name !== undefined) data.name = updates.name.trim();
    if (updates.email !== undefined) data.email = updates.email ? updates.email.trim() : null;
    if (updates.phone !== undefined) data.phone = updates.phone ? updates.phone.trim() : null;
    if (updates.passport !== undefined) data.passport = updates.passport ? updates.passport.trim() : null;
    if (updates.nationality !== undefined) data.nationality = updates.nationality;
    if (updates.isVip !== undefined) data.isVip = Boolean(updates.isVip);

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data,
      include: {
        notes: { orderBy: { date: 'desc' } }
      }
    });

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
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
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
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
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

    // If replacing an existing document, delete the old one from storage first
    if (customer.passportDocPath) {
      const { deleteFromStorage } = await import('../config/storage.js');
      await deleteFromStorage(customer.passportDocPath);
    }

    // Upload to Supabase Storage (private bucket)
    const { uploadToStorage } = await import('../config/storage.js');
    const { error: uploadError } = await uploadToStorage(storagePath, buffer, detectedType.mime);
    if (uploadError) {
      throw new ValidationError(
        `Storage upload failed: ${uploadError.message}`,
        'passportDocument'
      );
    }

    // Update customer record with storage path (never a URL)
    const uploadedAt = new Date();
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        passportDocPath: storagePath,
        passportDocUploadedAt: uploadedAt
      }
    });

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
  async getPassportDocumentUrl(customerId) {
    const prisma = getPrismaClient();
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
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
    return { url: data.signedUrl, expiresAt };
  },

  /**
   * Delete a customer's passport document (ADMIN only — enforced at route level)
   * @param {string} customerId
   * @param {object} currentUser
   */
  async deletePassportDocument(customerId, currentUser = {}) {
    const prisma = getPrismaClient();
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
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
  }
};

