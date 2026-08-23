import fs from 'fs';
import { INITIAL_CUSTOMERS, INITIAL_EMPLOYEES, INITIAL_TICKETS, INITIAL_ACTIVITY_LOGS, INITIAL_SETTINGS } from '../js/data/mock-data.js';

let sql = '-- AfricaTravel - Master Seed Data for Supabase PostgreSQL\n\n';

// 1. Settings
sql += 'INSERT INTO "system_settings" ("id", "data", "updatedAt") VALUES (\'default\', ' + JSON.stringify(JSON.stringify(INITIAL_SETTINGS)) + '::jsonb, NOW()) ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data";\n\n';

// 2. Users (Password: password123)
const hash = '$2b$10$j5DvY5WlZcJ5dUjcngZ04OgxvrZUxtERaHWTpnR9N/Ay84ToVC1em';
for (const emp of INITIAL_EMPLOYEES) {
  sql += `INSERT INTO "users" ("id", "name", "email", "role", "title", "passwordHash", "status", "lastActive", "createdAt", "updatedAt") VALUES ('${emp.id}', '${emp.name.replace(/'/g, "''")}', '${emp.email.toLowerCase()}', '${emp.role}', '${emp.title.replace(/'/g, "''")}', '${hash}', 'ACTIVE', 'Just now', NOW(), NOW()) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "passwordHash" = EXCLUDED."passwordHash";\n`;
}
sql += '\n';

// 3. Customers
for (const c of INITIAL_CUSTOMERS) {
  const email = c.email ? `'${c.email}'` : 'NULL';
  const phone = c.phone ? `'${c.phone}'` : 'NULL';
  const passport = c.passport ? `'${c.passport}'` : 'NULL';
  sql += `INSERT INTO "customers" ("id", "name", "email", "phone", "passport", "nationality", "isVip", "memberSince", "createdAt", "updatedAt") VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', ${email}, ${phone}, ${passport}, '${c.nationality}', ${Boolean(c.isVip)}, '${c.memberSince}', NOW(), NOW()) ON CONFLICT ("id") DO NOTHING;\n`;
}
sql += '\n';

// 4. Tickets
for (const t of INITIAL_TICKETS) {
  const phone = t.phone ? `'${t.phone}'` : 'NULL';
  const passport = t.passport ? `'${t.passport}'` : 'NULL';
  const nationality = t.nationality ? `'${t.nationality}'` : 'NULL';
  const dob = t.dob ? `'${t.dob}'` : 'NULL';
  const email = t.email ? `'${t.email}'` : 'NULL';
  const retDep = t.returnDepartureDate ? `'${t.returnDepartureDate}'` : 'NULL';
  const retArr = t.returnArrivalDate ? `'${t.returnArrivalDate}'` : 'NULL';
  const retFlt = t.returnFlightNumber ? `'${t.returnFlightNumber}'` : 'NULL';
  const orgTerm = t.originTerminal ? `'${t.originTerminal}'` : 'NULL';
  const orgAir = t.originAirportName ? `'${t.originAirportName.replace(/'/g, "''")}'` : 'NULL';
  const destTerm = t.destinationTerminal ? `'${t.destinationTerminal}'` : 'NULL';
  const destAir = t.destinationAirportName ? `'${t.destinationAirportName.replace(/'/g, "''")}'` : 'NULL';
  const fltDur = t.flightDuration ? `'${t.flightDuration}'` : 'NULL';
  const seat = t.seat ? `'${t.seat}'` : 'NULL';
  const baggage = t.baggage ? `'${t.baggage}'` : 'NULL';
  
  sql += `INSERT INTO "tickets" ("id", "ticketNumber", "pnr", "customerId", "passengerName", "phone", "passport", "nationality", "dob", "email", "airline", "airlineCode", "flightNumber", "returnFlightNumber", "origin", "originTerminal", "originAirportName", "destination", "destinationTerminal", "destinationAirportName", "departureDate", "arrivalDate", "returnDepartureDate", "returnArrivalDate", "tripType", "flightDuration", "cabinClass", "seat", "baggage", "ticketPrice", "currency", "status", "createdBy", "createdById", "createdAt", "updatedAt") VALUES ('${t.id}', '${t.ticketNumber}', '${t.pnr}', '${t.customerId}', '${t.passengerName.replace(/'/g, "''")}', ${phone}, ${passport}, ${nationality}, ${dob}, ${email}, '${t.airline}', '${t.airlineCode}', '${t.flightNumber}', ${retFlt}, '${t.origin}', ${orgTerm}, ${orgAir}, '${t.destination}', ${destTerm}, ${destAir}, '${t.departureDate}', '${t.arrivalDate}', ${retDep}, ${retArr}, '${t.tripType}', ${fltDur}, '${t.cabinClass}', ${seat}, ${baggage}, ${t.ticketPrice}, '${t.currency || 'EGP'}', '${t.status}', '${t.createdBy}', '${t.createdById || 'EMP-101'}', '${t.createdAt || new Date().toISOString()}', NOW()) ON CONFLICT ("id") DO NOTHING;\n`;

  // Payments
  if (t.payments && t.payments.length > 0) {
    for (const p of t.payments) {
      const ref = p.reference ? `'${p.reference}'` : 'NULL';
      const notes = p.notes ? `'${p.notes.replace(/'/g, "''")}'` : 'NULL';
      sql += `INSERT INTO "payments" ("id", "ticketId", "amount", "currency", "method", "reference", "date", "addedBy", "notes", "createdAt") VALUES ('${p.id}', '${t.id}', ${p.amount}, '${p.currency || 'EGP'}', '${p.method}', ${ref}, '${p.date}', '${p.addedBy}', ${notes}, NOW()) ON CONFLICT ("id") DO NOTHING;\n`;
    }
  }

  // Modifications
  if (t.modifications && t.modifications.length > 0) {
    for (const m of t.modifications) {
      sql += `INSERT INTO "modifications" ("id", "ticketId", "title", "originalFlight", "newFlight", "changeFee", "currency", "reason", "requestedBy", "processedBy", "date", "status", "createdAt") VALUES ('${m.id}', '${t.id}', '${m.title}', '${JSON.stringify(m.originalFlight)}'::jsonb, '${JSON.stringify(m.newFlight)}'::jsonb, ${m.changeFee || 0}, '${m.currency || 'EGP'}', '${(m.reason || '').replace(/'/g, "''")}', '${m.requestedBy}', '${m.processedBy}', '${m.date}', '${m.status || 'COMPLETED'}', NOW()) ON CONFLICT ("id") DO NOTHING;\n`;
    }
  }

  // Refunds
  if (t.refunds && t.refunds.length > 0) {
    for (const r of t.refunds) {
      sql += `INSERT INTO "refunds" ("id", "ticketId", "originalAmount", "totalPaid", "amount", "currency", "reason", "status", "requestedDate", "processedDate", "processedBy", "createdAt") VALUES ('${r.id}', '${t.id}', ${r.originalAmount || t.ticketPrice}, ${r.totalPaid || 'NULL'}, ${r.amount}, '${r.currency || 'EGP'}', '${(r.reason || '').replace(/'/g, "''")}', '${r.status || 'COMPLETED'}', '${r.requestedDate}', '${r.processedDate}', '${r.processedBy}', NOW()) ON CONFLICT ("id") DO NOTHING;\n`;
    }
  }
}

// 5. Activity Logs
for (const a of INITIAL_ACTIVITY_LOGS) {
  const tId = a.ticketId ? `'${a.ticketId}'` : 'NULL';
  const cId = a.customerId ? `'${a.customerId}'` : 'NULL';
  sql += `INSERT INTO "audit_logs" ("id", "timestamp", "user", "action", "ticketId", "customerId", "description", "createdAt") VALUES ('${a.id}', '${a.timestamp}', '${a.user}', '${a.action}', ${tId}, ${cId}, '${a.description.replace(/'/g, "''")}', NOW()) ON CONFLICT ("id") DO NOTHING;\n`;
}

fs.writeFileSync('prisma/seed_all_data.sql', sql);
console.log('✅ Generated prisma/seed_all_data.sql successfully! Total bytes:', sql.length);
