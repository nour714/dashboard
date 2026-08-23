/**
 * AfricaTravel - Master Database Seeder
 *
 * Populates PostgreSQL with realistic agency data from mock-data.js.
 * Encrypts all passwords using bcrypt (cost factor >= 10).
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  INITIAL_CUSTOMERS,
  INITIAL_EMPLOYEES,
  INITIAL_TICKETS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_SETTINGS
} from '../js/data/mock-data.js';

const prisma = new PrismaClient();

export async function seed() {
  console.log('🌱 Starting AfricaTravel database seeding...');

  // 1. Seed System Settings
  console.log('  -> Seeding System Settings...');
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: { data: INITIAL_SETTINGS },
    create: { id: 'default', data: INITIAL_SETTINGS }
  });

  // 2. Seed Employees / Users (with bcrypt hashed passwords)
  console.log('  -> Seeding Users & Employees...');
  const saltRounds = 10;
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (isProduction && (!defaultPassword || defaultPassword === 'password123')) {
    throw new Error('❌ FATAL: Cannot seed database in production with default/weak password. Set a strong DEFAULT_ADMIN_PASSWORD.');
  }

  const passwordToUse = defaultPassword || 'password123';
  const hashedPassword = await bcrypt.hash(passwordToUse, saltRounds);

  for (const emp of INITIAL_EMPLOYEES) {
    await prisma.user.upsert({
      where: { id: emp.id },
      update: {
        name: emp.name,
        email: emp.email.toLowerCase(),
        role: emp.role === 'ADMIN' ? 'ADMIN' : 'AGENT',
        title: emp.title,
        passwordHash: hashedPassword,
        status: emp.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        lastActive: emp.lastActive || 'Just now'
      },
      create: {
        id: emp.id,
        name: emp.name,
        email: emp.email.toLowerCase(),
        role: emp.role === 'ADMIN' ? 'ADMIN' : 'AGENT',
        title: emp.title,
        passwordHash: hashedPassword,
        status: emp.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        lastActive: emp.lastActive || 'Just now'
      }
    });
  }

  // 3. Seed Customers and their Notes
  console.log('  -> Seeding Customers and Notes...');
  for (const cust of INITIAL_CUSTOMERS) {
    await prisma.customer.upsert({
      where: { id: cust.id },
      update: {
        name: cust.name,
        email: cust.email || null,
        phone: cust.phone || null,
        passport: cust.passport || null,
        nationality: cust.nationality || 'Egyptian (EGY)',
        isVip: Boolean(cust.isVip),
        memberSince: cust.memberSince || '2024'
      },
      create: {
        id: cust.id,
        name: cust.name,
        email: cust.email || null,
        phone: cust.phone || null,
        passport: cust.passport || null,
        nationality: cust.nationality || 'Egyptian (EGY)',
        isVip: Boolean(cust.isVip),
        memberSince: cust.memberSince || '2024'
      }
    });

    // Delete existing notes for clean idempotent seed
    await prisma.customerNote.deleteMany({ where: { customerId: cust.id } });

    if (Array.isArray(cust.notes) && cust.notes.length > 0) {
      for (const note of cust.notes) {
        await prisma.customerNote.create({
          data: {
            customerId: cust.id,
            author: note.author || 'Agent',
            text: note.text,
            date: note.date ? new Date(note.date) : new Date()
          }
        });
      }
    }
  }

  // 4. Seed Tickets with Payments, Modifications, and Refunds
  console.log('  -> Seeding Tickets, Payments, Modifications, and Refunds...');
  for (const ticket of INITIAL_TICKETS) {
    // Delete existing child records for clean idempotent seeding
    await prisma.payment.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.modification.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.refund.deleteMany({ where: { ticketId: ticket.id } });

    // Find if user exists for createdById relation
    const userExists = ticket.createdById
      ? await prisma.user.findUnique({ where: { id: ticket.createdById } })
      : null;

    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {
        ticketNumber: ticket.ticketNumber,
        pnr: ticket.pnr,
        customerId: ticket.customerId,
        passengerName: ticket.passengerName,
        phone: ticket.phone || null,
        passport: ticket.passport || null,
        nationality: ticket.nationality || null,
        dob: ticket.dob || null,
        email: ticket.email || null,
        airline: ticket.airline,
        airlineCode: ticket.airlineCode || 'XX',
        flightNumber: ticket.flightNumber,
        returnFlightNumber: ticket.returnFlightNumber || null,
        origin: ticket.origin,
        originTerminal: ticket.originTerminal || null,
        originAirportName: ticket.originAirportName || null,
        destination: ticket.destination,
        destinationTerminal: ticket.destinationTerminal || null,
        destinationAirportName: ticket.destinationAirportName || null,
        departureDate: new Date(ticket.departureDate),
        arrivalDate: new Date(ticket.arrivalDate),
        returnDepartureDate: ticket.returnDepartureDate ? new Date(ticket.returnDepartureDate) : null,
        returnArrivalDate: ticket.returnArrivalDate ? new Date(ticket.returnArrivalDate) : null,
        tripType: ticket.tripType || 'One Way',
        flightDuration: ticket.flightDuration || null,
        cabinClass: ticket.cabinClass || 'Economy (Y)',
        seat: ticket.seat || null,
        baggage: ticket.baggage || null,
        ticketPrice: Number(ticket.ticketPrice) || 0,
        currency: ticket.currency || 'EGP',
        status: ticket.status || 'CONFIRMED',
        createdBy: ticket.createdBy || 'Agent',
        createdById: userExists ? ticket.createdById : null,
        createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date()
      },
      create: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        pnr: ticket.pnr,
        customerId: ticket.customerId,
        passengerName: ticket.passengerName,
        phone: ticket.phone || null,
        passport: ticket.passport || null,
        nationality: ticket.nationality || null,
        dob: ticket.dob || null,
        email: ticket.email || null,
        airline: ticket.airline,
        airlineCode: ticket.airlineCode || 'XX',
        flightNumber: ticket.flightNumber,
        returnFlightNumber: ticket.returnFlightNumber || null,
        origin: ticket.origin,
        originTerminal: ticket.originTerminal || null,
        originAirportName: ticket.originAirportName || null,
        destination: ticket.destination,
        destinationTerminal: ticket.destinationTerminal || null,
        destinationAirportName: ticket.destinationAirportName || null,
        departureDate: new Date(ticket.departureDate),
        arrivalDate: new Date(ticket.arrivalDate),
        returnDepartureDate: ticket.returnDepartureDate ? new Date(ticket.returnDepartureDate) : null,
        returnArrivalDate: ticket.returnArrivalDate ? new Date(ticket.returnArrivalDate) : null,
        tripType: ticket.tripType || 'One Way',
        flightDuration: ticket.flightDuration || null,
        cabinClass: ticket.cabinClass || 'Economy (Y)',
        seat: ticket.seat || null,
        baggage: ticket.baggage || null,
        ticketPrice: Number(ticket.ticketPrice) || 0,
        currency: ticket.currency || 'EGP',
        status: ticket.status || 'CONFIRMED',
        createdBy: ticket.createdBy || 'Agent',
        createdById: userExists ? ticket.createdById : null,
        createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date()
      }
    });

    // Payments
    if (Array.isArray(ticket.payments)) {
      for (const p of ticket.payments) {
        await prisma.payment.create({
          data: {
            id: p.id,
            ticketId: ticket.id,
            amount: Number(p.amount) || 0,
            currency: p.currency || ticket.currency || 'EGP',
            method: p.method || 'Credit Card',
            reference: p.reference || null,
            date: p.date ? new Date(p.date) : new Date(),
            addedBy: p.addedBy || 'Agent',
            notes: p.notes || null
          }
        });
      }
    }

    // Modifications
    if (Array.isArray(ticket.modifications)) {
      for (const m of ticket.modifications) {
        await prisma.modification.create({
          data: {
            id: m.id,
            ticketId: ticket.id,
            title: m.title || 'Modification',
            originalFlight: m.originalFlight || {},
            newFlight: m.newFlight || {},
            changeFee: Number(m.changeFee) || 0,
            currency: m.currency || ticket.currency || 'EGP',
            reason: m.reason || '',
            requestedBy: m.requestedBy || ticket.passengerName,
            processedBy: m.processedBy || 'Agent',
            date: m.date ? new Date(m.date) : new Date(),
            status: m.status || 'COMPLETED'
          }
        });
      }
    }

    // Refunds
    if (Array.isArray(ticket.refunds)) {
      for (const r of ticket.refunds) {
        await prisma.refund.create({
          data: {
            id: r.id,
            ticketId: ticket.id,
            originalAmount: r.originalAmount ? Number(r.originalAmount) : Number(ticket.ticketPrice),
            totalPaid: r.totalPaid ? Number(r.totalPaid) : null,
            amount: Number(r.amount) || 0,
            currency: r.currency || ticket.currency || 'EGP',
            reason: r.reason || '',
            status: r.status || 'COMPLETED',
            requestedDate: r.requestedDate ? new Date(r.requestedDate) : new Date(),
            processedDate: r.processedDate ? new Date(r.processedDate) : new Date(),
            processedBy: r.processedBy || 'Agent'
          }
        });
      }
    }
  }

  // 5. Seed Activity Logs
  console.log('  -> Seeding Activity Logs...');
  await prisma.auditLog.deleteMany();
  for (const log of INITIAL_ACTIVITY_LOGS) {
    await prisma.auditLog.create({
      data: {
        id: log.id,
        timestamp: new Date(log.timestamp),
        user: log.user,
        action: log.action,
        ticketId: log.ticketId || null,
        customerId: log.customerId || null,
        description: log.description
      }
    });
  }

  console.log('✅ AfricaTravel database successfully seeded!');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed()
    .catch((e) => {
      console.error('❌ Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
