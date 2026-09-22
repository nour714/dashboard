/**
 * AfricaTravel — Additional Mock Data Seeder (Visas & Expenses)
 */

import dotenv from 'dotenv';
dotenv.config();

import { getPrismaClient } from '../../backend/src/config/database.js';

const prisma = getPrismaClient();

async function seedVisasAndExpenses() {
  console.log('🌱 Seeding Visas and Expenses mock data...');

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  const createdBy = admin ? admin.name : 'Mohamed Raafat';
  const createdById = admin ? admin.id : 'EMP-101';

  // 1. Seed Visas
  await prisma.visa.deleteMany({});
  const mockVisas = [
    {
      clientName: 'Mahmoud El-Sayed',
      phone: '+20 101 234 5678',
      visaType: 'TOURIST',
      country: 'United Arab Emirates',
      submissionDate: new Date('2026-09-10T10:00:00Z'),
      price: 6500,
      paidAmount: 6500,
      costPrice: 4200,
      currency: 'EGP',
      paymentStatus: 'PAID',
      notes: 'Express 30-day single entry tourist visa issued.',
      createdBy,
      createdById
    },
    {
      clientName: 'Kareem Abdelrahman',
      phone: '+20 112 345 6789',
      visaType: 'UMRAH_HAJJ',
      country: 'Saudi Arabia',
      submissionDate: new Date('2026-09-15T12:30:00Z'),
      price: 18500,
      paidAmount: 10000,
      costPrice: 14000,
      currency: 'EGP',
      paymentStatus: 'PARTIAL',
      notes: 'Umrah seasonal visa with biometric appointments scheduled.',
      createdBy,
      createdById
    },
    {
      clientName: 'Yasmine Mostafa',
      phone: '+20 123 456 7890',
      visaType: 'STUDY',
      country: 'United Kingdom',
      submissionDate: new Date('2026-09-18T09:15:00Z'),
      price: 12000,
      paidAmount: 0,
      costPrice: 8500,
      currency: 'EGP',
      paymentStatus: 'UNPAID',
      notes: 'Tier 4 student visa application under review by embassy.',
      createdBy,
      createdById
    },
    {
      clientName: 'Omar Farouk',
      phone: '+20 109 876 5432',
      visaType: 'WORK',
      country: 'Qatar',
      submissionDate: new Date('2026-09-20T14:00:00Z'),
      price: 850,
      paidAmount: 850,
      costPrice: 550,
      currency: 'USD',
      paymentStatus: 'PAID',
      notes: 'Employment entry permit approved.',
      createdBy,
      createdById
    }
  ];

  for (const v of mockVisas) {
    await prisma.visa.create({ data: v });
  }
  console.log(`  -> Seeded ${mockVisas.length} visas.`);

  // 2. Seed Expenses
  await prisma.expense.deleteMany({});
  const mockExpenses = [
    {
      category: 'SERVICES',
      amount: 4500,
      currency: 'EGP',
      description: 'Office internet and cloud backup subscription renewal',
      date: new Date('2026-09-05T11:00:00Z'),
      createdBy,
      createdById
    },
    {
      category: 'TRANSFERS',
      amount: 8200,
      currency: 'EGP',
      description: 'Airport VIP limousine transfer shuttle service for group booking',
      date: new Date('2026-09-12T15:30:00Z'),
      createdBy,
      createdById
    },
    {
      category: 'SERVICES',
      amount: 250,
      currency: 'USD',
      description: 'Global Amadeus GDS terminal monthly API license fees',
      date: new Date('2026-09-19T08:45:00Z'),
      createdBy,
      createdById
    }
  ];

  for (const e of mockExpenses) {
    await prisma.expense.create({ data: e });
  }
  console.log(`  -> Seeded ${mockExpenses.length} expenses.`);

  console.log('✅ Visas and Expenses successfully seeded!');
  await prisma.$disconnect();
}

seedVisasAndExpenses().catch(async (err) => {
  console.error('❌ Error seeding visas/expenses:', err);
  await prisma.$disconnect();
  process.exit(1);
});
