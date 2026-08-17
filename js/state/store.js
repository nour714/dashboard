/**
 * AfriciaTravel — Reactive State Store & Persistence Layer
 */

import {
  INITIAL_CUSTOMERS,
  INITIAL_EMPLOYEES,
  INITIAL_TICKETS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_SETTINGS
} from '../data/mock-data.js';

import {
  calculateTotalPaid,
  calculateRemaining,
  derivePaymentStatus
} from '../utils/calculations.js';

const STORAGE_KEY = 'AFRICIATRAVEL_STORE_V2';

class Store {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const user = parsed.currentUser || INITIAL_SETTINGS.profile;
        user.name = user.name || user.fullName || 'Ahmed Hassan';
        user.title = user.title || user.role || 'Senior Operations Director';
        delete user.avatar; // Ensure initials are used cleanly

        return {
          ...parsed,
          currentUser: user
        };
      }
    } catch (e) {
      console.warn('Could not restore state from localStorage, using seed data', e);
    }

    const defaultUser = { ...INITIAL_SETTINGS.profile };
    defaultUser.name = defaultUser.name || defaultUser.fullName || 'Ahmed Hassan';
    defaultUser.title = defaultUser.title || defaultUser.role || 'Senior Operations Director';
    delete defaultUser.avatar;

    return {
      tickets: INITIAL_TICKETS,
      customers: INITIAL_CUSTOMERS,
      employees: INITIAL_EMPLOYEES,
      activityLogs: INITIAL_ACTIVITY_LOGS,
      settings: INITIAL_SETTINGS,
      currentUser: defaultUser,
      isAuthenticated: true
    };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.saveState();
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  // --- Auth Actions ---
  login(email, password) {
    const employee = this.state.employees.find(e => e.email.toLowerCase() === email.toLowerCase()) || {
      id: 'EMP-101',
      name: email.split('@')[0],
      email: email,
      role: 'ADMIN',
      avatar: this.state.settings.profile.avatar
    };

    this.state.currentUser = {
      ...this.state.settings.profile,
      ...employee
    };
    this.state.isAuthenticated = true;
    this.notify();
    return true;
  }

  logout() {
    this.state.isAuthenticated = false;
    this.state.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session storage', e);
    }
    this.notify();
  }

  // --- Ticket Actions ---
  createTicket(ticketData) {
    const newId = `TK-${Math.floor(10000 + Math.random() * 90000)}`;
    const ticketNumber = ticketData.ticketNumber || `077-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const pnr = ticketData.pnr || `PNR${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Calculate initial payments
    const payments = [];
    if (ticketData.initialPayment && Number(ticketData.initialPayment) > 0) {
      payments.push({
        id: `PAY-${Date.now()}`,
        ticketId: newId,
        amount: Number(ticketData.initialPayment),
        currency: ticketData.currency || 'EGP',
        method: ticketData.paymentMethod || 'Credit Card',
        reference: ticketData.paymentReference || `INIT-${pnr}`,
        date: ticketData.paymentDate || new Date().toISOString(),
        addedBy: this.state.currentUser?.name || 'Agent',
        notes: 'Initial payment upon ticket issuance'
      });
    }

    const totalPaid = calculateTotalPaid(payments);
    const status = derivePaymentStatus(ticketData.ticketPrice, totalPaid, 'CONFIRMED');

    const newTicket = {
      id: newId,
      ticketNumber,
      pnr,
      customerId: ticketData.customerId || 'CUST-8924',
      passengerName: ticketData.passengerName || ticketData.customerName,
      phone: ticketData.phone || '',
      passport: ticketData.passport || '',
      nationality: ticketData.nationality || '',
      dob: ticketData.dob || '',
      email: ticketData.email || '',
      airline: ticketData.airline || 'EgyptAir',
      airlineCode: ticketData.airlineCode || 'MS',
      flightNumber: ticketData.flightNumber || `${ticketData.airlineCode || 'MS'} 901`,
      origin: ticketData.origin || 'CAI',
      destination: ticketData.destination || 'DXB',
      departureDate: ticketData.departureDate || new Date().toISOString(),
      arrivalDate: ticketData.arrivalDate || new Date().toISOString(),
      tripType: ticketData.tripType || 'One Way',
      cabinClass: ticketData.cabinClass || 'Economy (Y)',
      seat: ticketData.seat || '12A',
      baggage: ticketData.baggage || '1 x 23kg',
      ticketPrice: Number(ticketData.ticketPrice) || 0,
      currency: ticketData.currency || 'EGP',
      status: status,
      createdBy: this.state.currentUser?.name || 'Agent',
      createdById: this.state.currentUser?.id || 'EMP-101',
      createdAt: new Date().toISOString(),
      payments: payments,
      modifications: [],
      refunds: []
    };

    this.state.tickets.unshift(newTicket);

    // Add activity log
    this.addActivityLog({
      action: 'CREATE_TICKET',
      ticketId: newId,
      customerId: newTicket.customerId,
      description: `Created ticket ${newId} (${newTicket.origin} ✈ ${newTicket.destination}) for ${newTicket.passengerName}.`
    });

    this.notify();
    return newTicket;
  }

  updateTicket(ticketId, updates) {
    const ticketIndex = this.state.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) return null;

    this.state.tickets[ticketIndex] = {
      ...this.state.tickets[ticketIndex],
      ...updates
    };

    this.addActivityLog({
      action: 'UPDATE_TICKET',
      ticketId,
      customerId: this.state.tickets[ticketIndex].customerId,
      description: `Updated details for ticket ${ticketId}.`
    });

    this.notify();
    return this.state.tickets[ticketIndex];
  }

  // --- Payment Actions ---
  addPayment(ticketId, paymentData) {
    const ticket = this.state.tickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    const newPayment = {
      id: `PAY-${Date.now()}`,
      ticketId,
      amount: Number(paymentData.amount) || 0,
      currency: paymentData.currency || ticket.currency || 'EGP',
      method: paymentData.method || 'Credit Card',
      reference: paymentData.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      date: paymentData.date || new Date().toISOString(),
      addedBy: this.state.currentUser?.name || 'Agent',
      notes: paymentData.notes || ''
    };

    ticket.payments.push(newPayment);

    // Recalculate status
    const totalPaid = calculateTotalPaid(ticket.payments);
    ticket.status = derivePaymentStatus(ticket.ticketPrice, totalPaid, ticket.status);

    this.addActivityLog({
      action: 'ADD_PAYMENT',
      ticketId,
      customerId: ticket.customerId,
      description: `Recorded payment of ${newPayment.amount.toLocaleString()} ${newPayment.currency} via ${newPayment.method} (${newPayment.reference}).`
    });

    this.notify();
    return newPayment;
  }

  // --- Flight Modification Actions ---
  addModification(ticketId, modData) {
    const ticket = this.state.tickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    const modIndex = ticket.modifications.length + 1;
    const newMod = {
      id: `MOD-${Date.now()}`,
      ticketId,
      title: `Modification #${modIndex}`,
      originalFlight: {
        flightNumber: ticket.flightNumber,
        date: ticket.departureDate,
        route: `${ticket.origin} → ${ticket.destination}`,
        duration: ticket.flightDuration || '3h 30m'
      },
      newFlight: {
        flightNumber: modData.flightNumber || ticket.flightNumber,
        date: modData.newDepartureDate || ticket.departureDate,
        route: `${ticket.origin} → ${ticket.destination}`,
        note: modData.note || 'Schedule adjusted'
      },
      changeFee: Number(modData.changeFee) || 0,
      currency: ticket.currency,
      reason: modData.reason || 'Customer requested schedule adjustment',
      requestedBy: modData.requestedBy || ticket.passengerName,
      processedBy: this.state.currentUser?.name || 'Agent',
      date: new Date().toISOString(),
      status: 'COMPLETED'
    };

    // Update ticket departure if requested
    if (modData.newDepartureDate) {
      ticket.departureDate = modData.newDepartureDate;
    }
    if (modData.newArrivalDate) {
      ticket.arrivalDate = modData.newArrivalDate;
    }

    ticket.modifications.push(newMod);

    this.addActivityLog({
      action: 'MODIFY_FLIGHT',
      ticketId,
      customerId: ticket.customerId,
      description: `Added flight modification for ${ticketId} with change fee ${newMod.changeFee} ${ticket.currency}. Reason: ${newMod.reason}`
    });

    this.notify();
    return newMod;
  }

  // --- Refund Actions ---
  addRefund(ticketId, refundData) {
    const ticket = this.state.tickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    const totalPaid = calculateTotalPaid(ticket.payments);
    const refundAmount = Number(refundData.amount) || 0;

    const newRefund = {
      id: `RF-${Math.floor(9000 + Math.random() * 1000)}`,
      ticketId,
      originalAmount: ticket.ticketPrice,
      totalPaid: totalPaid,
      amount: refundAmount,
      currency: ticket.currency,
      reason: refundData.reason || 'Customer cancellation request',
      status: refundData.status || 'COMPLETED',
      requestedDate: new Date().toISOString(),
      processedDate: new Date().toISOString(),
      processedBy: this.state.currentUser?.name || 'Agent'
    };

    ticket.refunds.push(newRefund);

    if (newRefund.status === 'COMPLETED') {
      ticket.status = 'REFUNDED';
    } else {
      ticket.status = 'REFUND REQUESTED';
    }

    this.addActivityLog({
      action: newRefund.status === 'COMPLETED' ? 'COMPLETE_REFUND' : 'ADD_REFUND',
      ticketId,
      customerId: ticket.customerId,
      description: `Processed refund of ${refundAmount.toLocaleString()} ${ticket.currency} for ${ticketId}. Reason: ${newRefund.reason}`
    });

    this.notify();
    return newRefund;
  }

  // --- Customer Actions ---
  createCustomer(custData) {
    const newCust = {
      id: `CUST-${Math.floor(8900 + Math.random() * 1000)}`,
      name: custData.name,
      email: custData.email || '',
      phone: custData.phone || '',
      passport: custData.passport || '',
      nationality: custData.nationality || 'Egyptian (EGY)',
      isVip: Boolean(custData.isVip),
      memberSince: String(new Date().getFullYear()),
      notes: custData.initialNote ? [{
        author: this.state.currentUser?.name || 'Agent',
        date: new Date().toISOString(),
        text: custData.initialNote
      }] : []
    };

    this.state.customers.unshift(newCust);

    this.addActivityLog({
      action: 'UPDATE_CUSTOMER',
      ticketId: null,
      customerId: newCust.id,
      description: `Created new customer record for ${newCust.name} (${newCust.id}).`
    });

    this.notify();
    return newCust;
  }

  updateCustomer(customerId, updates) {
    const index = this.state.customers.findIndex(c => c.id === customerId);
    if (index === -1) return null;

    this.state.customers[index] = {
      ...this.state.customers[index],
      ...updates
    };

    this.addActivityLog({
      action: 'UPDATE_CUSTOMER',
      ticketId: null,
      customerId,
      description: `Updated profile for customer ${this.state.customers[index].name}.`
    });

    this.notify();
    return this.state.customers[index];
  }

  addCustomerNote(customerId, noteText) {
    const customer = this.state.customers.find(c => c.id === customerId);
    if (!customer) return null;

    if (!Array.isArray(customer.notes)) {
      customer.notes = [];
    }

    const note = {
      author: this.state.currentUser?.name || 'Agent',
      date: new Date().toISOString(),
      text: noteText
    };

    customer.notes.unshift(note);
    this.notify();
    return note;
  }

  // --- Employee Actions ---
  addEmployee(empData) {
    const newEmp = {
      id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: empData.name,
      email: empData.email,
      role: empData.role || 'AGENT',
      title: empData.title || 'Ticketing Officer',
      ticketsCount: 0,
      sales: 0,
      collected: 0,
      refunds: 0,
      outstanding: 0,
      status: 'ACTIVE',
      lastActive: 'Just now'
    };

    this.state.employees.unshift(newEmp);
    this.notify();
    return newEmp;
  }

  // --- Activity Log Actions ---
  addActivityLog(logData) {
    const newLog = {
      id: `ACT-${Math.floor(900 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      user: this.state.currentUser?.name || 'Admin User',
      action: logData.action,
      ticketId: logData.ticketId || null,
      customerId: logData.customerId || null,
      description: logData.description
    };

    this.state.activityLogs.unshift(newLog);
  }

  // --- Settings Actions ---
  updateSettings(section, data) {
    if (!this.state.settings[section]) {
      this.state.settings[section] = {};
    }
    this.state.settings[section] = {
      ...this.state.settings[section],
      ...data
    };
    if (section === 'profile') {
      this.state.currentUser = {
        ...(this.state.currentUser || {}),
        ...data
      };
    }
    this.notify();
  }
}

export const store = new Store();
