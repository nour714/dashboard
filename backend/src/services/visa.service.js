/**
 * AfricaTravel — Visa Management Service
 */

import Decimal from 'decimal.js';
import { getPrismaClient } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';
import { asDecimal, moneyNumber } from '../utils/money.js';

export function deriveVisaPaymentStatus(price, paidAmount, currentStatus) {
  if (currentStatus && ['PAID', 'PARTIAL', 'UNPAID'].includes(currentStatus)) {
    return currentStatus;
  }
  const priceDec = asDecimal(price || 0);
  const paidDec = asDecimal(paidAmount || 0);
  if (paidDec.isZero() || paidDec.lessThan(0)) return 'UNPAID';
  if (paidDec.greaterThanOrEqualTo(priceDec) && priceDec.greaterThan(0)) return 'PAID';
  return 'PARTIAL';
}

export function calculateVisaRemaining(price, paidAmount) {
  const priceDec = asDecimal(price || 0);
  const paidDec = asDecimal(paidAmount || 0);
  return moneyNumber(Decimal.max(0, priceDec.minus(paidDec)));
}

export const VisaService = {
  /**
   * Create a new visa record
   */
  async createVisa(data, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeCreation = async (tx) => {
      const priceVal = data.price;
      const paidVal = data.paidAmount !== undefined && data.paidAmount !== null ? data.paidAmount : 0;
      const statusVal = data.paymentStatus || deriveVisaPaymentStatus(priceVal, paidVal);

      const newVisa = await tx.visa.create({
        data: {
          clientName: data.clientName,
          phone: data.phone || null,
          visaType: data.visaType,
          country: data.country,
          submissionDate: new Date(data.submissionDate),
          price: priceVal,
          paidAmount: paidVal,
          costPrice: data.costPrice || null,
          currency: data.currency || 'EGP',
          paymentStatus: statusVal,
          notes: data.notes || null,
          createdBy: currentUser?.name || currentUser?.email || 'Staff',
          createdById: currentUser?.id || null
        }
      });

      const remainingAmount = calculateVisaRemaining(newVisa.price, newVisa.paidAmount);

      await AuditService.recordCriticalLog({
        user: currentUser?.name || currentUser?.email || 'Staff',
        userId: currentUser?.id || null,
        action: 'CREATE_VISA',
        description: `Created visa record ${newVisa.id} for ${newVisa.clientName} (${newVisa.visaType} to ${newVisa.country}).`,
        metadata: {
          visaId: newVisa.id,
          clientName: newVisa.clientName,
          visaType: newVisa.visaType,
          country: newVisa.country,
          price: Number(newVisa.price),
          paidAmount: Number(newVisa.paidAmount || 0),
          remainingAmount,
          currency: newVisa.currency,
          paymentStatus: newVisa.paymentStatus,
          createdById: currentUser?.id || null
        }
      }, { tx });

      return {
        ...newVisa,
        remainingAmount
      };
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeCreation);
    }
    return await executeCreation(prisma);
  },

  /**
   * Retrieve paginated visas with visibility filtering based on role
   */
  async getVisas(filters = {}, currentUser) {
    const prisma = getPrismaClient();
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 25;
    const { visaType, paymentStatus, search, startDate, endDate } = filters;

    const where = { deletedAt: null };

    // Role-based visibility
    if (currentUser?.role !== 'ADMIN') {
      where.createdById = currentUser?.id;
    }

    if (visaType) {
      where.visaType = visaType;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (startDate || endDate) {
      where.submissionDate = {};
      if (startDate) where.submissionDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (typeof endDate === 'string' && endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.submissionDate.lte = end;
      }
    }

    // Compute totals over the FULL filtered set
    let totalsByGroup = [];
    if (typeof prisma?.visa?.groupBy === 'function') {
      try {
        totalsByGroup = await prisma.visa.groupBy({
          by: ['currency'],
          where,
          _sum: {
            price: true,
            paidAmount: true,
            costPrice: true
          },
          _count: {
            _all: true
          }
        });
      } catch {
        totalsByGroup = [];
      }
    }

    // Fallback if groupBy is not supported or mock
    if (totalsByGroup.length === 0 && typeof prisma?.visa?.findMany === 'function') {
      try {
        const allMatching = await prisma.visa.findMany({
          where,
          select: { price: true, paidAmount: true, costPrice: true, currency: true }
        });
        const map = {};
        for (const item of allMatching) {
          const curr = item.currency || 'EGP';
          if (!map[curr]) {
            map[curr] = { currency: curr, sumPrice: asDecimal(0), sumPaid: asDecimal(0), sumCost: asDecimal(0), count: 0 };
          }
          map[curr].sumPrice = map[curr].sumPrice.plus(asDecimal(item.price || 0));
          map[curr].sumPaid = map[curr].sumPaid.plus(asDecimal(item.paidAmount || 0));
          map[curr].sumCost = map[curr].sumCost.plus(asDecimal(item.costPrice || 0));
          map[curr].count += 1;
        }
        totalsByGroup = Object.values(map).map(m => ({
          currency: m.currency,
          _sum: {
            price: moneyNumber(m.sumPrice),
            paidAmount: moneyNumber(m.sumPaid),
            costPrice: moneyNumber(m.sumCost)
          },
          _count: { _all: m.count }
        }));
      } catch {
        totalsByGroup = [];
      }
    }

    const byCurrency = {};
    for (const group of totalsByGroup) {
      const curr = group.currency || 'EGP';
      const sumPriceDec = asDecimal(group._sum?.price || 0);
      const sumPaidDec = asDecimal(group._sum?.paidAmount || 0);
      const sumRemainingDec = Decimal.max(0, sumPriceDec.minus(sumPaidDec));
      const sumCostDec = asDecimal(group._sum?.costPrice || 0);
      const count = group._count?._all || 0;
      
      byCurrency[curr] = {
        totalPrice: moneyNumber(sumPriceDec),
        totalPaidAmount: moneyNumber(sumPaidDec),
        totalRemainingAmount: moneyNumber(sumRemainingDec),
        totalCostPrice: moneyNumber(sumCostDec),
        count,
        currency: curr
      };
    }

    if (Object.keys(byCurrency).length === 0) {
      byCurrency['EGP'] = {
        totalPrice: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
        totalCostPrice: 0,
        count: 0,
        currency: 'EGP'
      };
    }

    const primaryCurr = Object.keys(byCurrency)[0] || 'EGP';
    const totals = {
      totalPrice: byCurrency[primaryCurr].totalPrice,
      totalPaidAmount: byCurrency[primaryCurr].totalPaidAmount,
      totalRemainingAmount: byCurrency[primaryCurr].totalRemainingAmount,
      totalCostPrice: byCurrency[primaryCurr].totalCostPrice,
      count: byCurrency[primaryCurr].count,
      currency: primaryCurr,
      byCurrency
    };

    const [visas, total] = await Promise.all([
      prisma.visa.findMany({
        where,
        orderBy: { submissionDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.visa.count({ where })
    ]);

    const formattedVisas = visas.map(v => ({
      ...v,
      remainingAmount: calculateVisaRemaining(v.price, v.paidAmount)
    }));

    return {
      visas: formattedVisas,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      },
      totals
    };
  },

  /**
   * Get a single visa by ID
   */
  async getVisaById(id, currentUser) {
    const prisma = getPrismaClient();
    
    const visa = await prisma.visa.findFirst({
      where: { id, deletedAt: null }
    });
    
    if (!visa) {
      throw new NotFoundError('Visa', id);
    }
    
    if (currentUser?.role !== 'ADMIN' && visa.createdById !== currentUser?.id) {
      throw new ForbiddenError('You can only view visas you created');
    }
    
    return {
      ...visa,
      remainingAmount: calculateVisaRemaining(visa.price, visa.paidAmount)
    };
  },

  /**
   * Update an existing visa record (ADMIN and AGENT)
   */
  async updateVisa(id, data, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeUpdate = async (tx) => {
      const existing = await tx.visa.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existing) {
        throw new NotFoundError('Visa', id);
      }

      if (currentUser?.role !== 'ADMIN' && existing.createdById !== currentUser?.id) {
        throw new ForbiddenError('You can only edit visas you created');
      }

      const updateData = {};
      if (data.clientName !== undefined) updateData.clientName = data.clientName.trim();
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.visaType !== undefined) updateData.visaType = data.visaType;
      if (data.country !== undefined) updateData.country = data.country.trim();
      if (data.submissionDate !== undefined) updateData.submissionDate = new Date(data.submissionDate);
      if (data.price !== undefined) updateData.price = data.price;
      if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount;
      if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.notes !== undefined) updateData.notes = data.notes;

      if (data.paymentStatus !== undefined) {
        updateData.paymentStatus = data.paymentStatus;
      } else if (data.paidAmount !== undefined || data.price !== undefined) {
        const finalPrice = data.price !== undefined ? data.price : existing.price;
        const finalPaid = data.paidAmount !== undefined ? data.paidAmount : existing.paidAmount;
        updateData.paymentStatus = deriveVisaPaymentStatus(finalPrice, finalPaid);
      }

      const updated = await tx.visa.update({
        where: { id: existing.id },
        data: updateData
      });

      const remainingAmount = calculateVisaRemaining(updated.price, updated.paidAmount);

      await AuditService.recordCriticalLog({
        user: currentUser?.name || currentUser?.email || 'Staff',
        userId: currentUser?.id || null,
        action: 'UPDATE_VISA',
        description: `Updated visa ${existing.id} for ${updated.clientName}.`,
        metadata: {
          userId: currentUser?.id || null,
          visaId: existing.id,
          changes: updateData,
          remainingAmount
        }
      }, { tx });

      return {
        ...updated,
        remainingAmount
      };
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeUpdate);
    }
    return await executeUpdate(prisma);
  },

  /**
   * Soft-delete a visa record (ADMIN only)
   */
  async deleteVisa(id, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeDeletion = async (tx) => {
      const existing = await tx.visa.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existing) {
        throw new NotFoundError('Visa', id);
      }

      if (currentUser?.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can delete visa records');
      }

      await AuditService.recordCriticalLog({
        user: currentUser?.name || currentUser?.email || 'Admin',
        userId: currentUser?.id || null,
        action: 'DELETE_VISA',
        description: `Admin ${currentUser?.name || 'Admin'} deleted visa ${existing.id} for ${existing.clientName}.`,
        metadata: {
          adminId: currentUser?.id || null,
          visaId: existing.id,
          clientName: existing.clientName
        }
      }, { tx });

      return await tx.visa.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() }
      });
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeDeletion);
    }
    return await executeDeletion(prisma);
  }
};
