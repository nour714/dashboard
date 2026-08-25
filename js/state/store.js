/**
 * AfricaTravel — Reactive State Store (API-Backed Cache)
 *
 * Replaces the previous localStorage/mock-data store with a thin in-memory
 * cache hydrated from the backend API. Reads stay synchronous (pages read
 * from the cache); mutations call the API first and only patch the cache
 * once the backend confirms the write, so the server (and its domain
 * validation layer) remains the single source of truth.
 */

import { apiClient } from '../services/api-client.js';
import { getStoredUser, setSession, clearSession, hasSession, updateStoredUser } from '../services/api-client.js';
import { calculateTotalPaid, derivePaymentStatus } from '../domain/ticket-rules.js';
import { NotFoundError } from '../domain/errors.js';
import { INITIAL_SETTINGS } from '../data/mock-data.js';

class Store {
  constructor() {
    this.listeners = new Set();
    this.hydrated = false;
    this.hydrating = null;
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    const storedUser = getStoredUser();
    const defaultUser = { ...INITIAL_SETTINGS.profile };

    const currentUser = storedUser
      ? { ...defaultUser, ...storedUser, name: storedUser.name || defaultUser.name, title: storedUser.title || defaultUser.title }
      : null;
    if (currentUser) delete currentUser.avatar;

    return {
      tickets: [],
      customers: [],
      employees: [],
      activityLogs: [],
      settings: INITIAL_SETTINGS,
      currentUser,
      isAuthenticated: hasSession()
    };
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  // --- Hydration: fetches live data from the backend once per session ---
  async ensureHydrated() {
    if (this.hydrated) return;
    if (this.hydrating) return this.hydrating;

    this.hydrating = this.hydrate().finally(() => {
      this.hydrating = null;
    });
    return this.hydrating;
  }

  async hydrate() {
    if (!hasSession()) return;

    const [ticketsRes, customersRes, employeesRes, activityRes, settingsRes] = await Promise.all([
      apiClient.get('/tickets', { limit: 100 }),
      apiClient.get('/customers'),
      apiClient.get('/employees'),
      apiClient.get('/activity', { limit: 100 }),
      apiClient.get('/settings')
    ]);

    if (ticketsRes.success) this.state.tickets = ticketsRes.data.tickets || [];
    if (customersRes.success) this.state.customers = customersRes.data || [];
    // Employees endpoint is ADMIN-only; agents simply keep an empty list.
    if (employeesRes.success) this.state.employees = employeesRes.data || [];
    if (activityRes.success) this.state.activityLogs = activityRes.data.logs || activityRes.data || [];
    if (settingsRes.success && settingsRes.data && typeof settingsRes.data === 'object') {
      this.state.settings = {
        ...INITIAL_SETTINGS,
        ...settingsRes.data
      };
    }

    this.hydrated = true;
    this.notify();
  }

  async refreshTickets() {
    const res = await apiClient.get('/tickets', { limit: 100 });
    if (res.success) {
      this.state.tickets = res.data.tickets || [];
      this.notify();
    }
    return res;
  }

  // --- Auth Actions ---
  async login(email, password, rememberMe = true) {
    const res = await apiClient.post('/auth/login', { email, password }, { auth: false });
    if (!res.success) {
      return { success: false, error: res.error };
    }

    const { user, accessToken } = res.data;
    setSession({ accessToken, user, rememberMe });

    this.state.currentUser = { ...INITIAL_SETTINGS.profile, ...user };
    this.state.isAuthenticated = true;
    this.hydrated = false;

    this.notify();
    await this.ensureHydrated();
    return { success: true, user: this.state.currentUser };
  }

  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (e) {
      // Best-effort server-side revocation; always clear local session regardless.
    }

    clearSession();
    this.state = {
      tickets: [],
      customers: [],
      employees: [],
      activityLogs: [],
      settings: INITIAL_SETTINGS,
      currentUser: null,
      isAuthenticated: false
    };
    this.hydrated = false;
    this.notify();
  }

  // --- Ticket Actions ---
  async createTicket(ticketData) {
    const res = await apiClient.post('/tickets', ticketData);
    if (!res.success) return res;

    this.state.tickets.unshift(res.data);
    this.pushActivityLog({
      action: 'CREATE_TICKET',
      ticketId: res.data.id,
      customerId: res.data.customerId,
      description: `Created ticket ${res.data.id} (${res.data.origin} ✈ ${res.data.destination}) for ${res.data.passengerName}.`
    });
    this.notify();
    return res;
  }

  async updateTicket(ticketId, updates) {
    const res = await apiClient.patch(`/tickets/${ticketId}`, updates);
    if (!res.success) return res;

    const index = this.state.tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) this.state.tickets[index] = res.data;

    this.pushActivityLog({
      action: 'UPDATE_TICKET',
      ticketId,
      customerId: res.data.customerId,
      description: `Updated details for ticket ${ticketId}.`
    });
    this.notify();
    return res;
  }

  // --- Payment Actions ---
  async addPayment(ticketId, paymentData) {
    const res = await apiClient.post(`/tickets/${ticketId}/payments`, paymentData);
    if (!res.success) return res;

    const ticket = this.state.tickets.find(t => t.id === ticketId);
    if (ticket) {
      if (!Array.isArray(ticket.payments)) ticket.payments = [];
      ticket.payments.unshift(res.data);
      const totalPaid = calculateTotalPaid(ticket.payments);
      ticket.status = derivePaymentStatus(ticket.ticketPrice, totalPaid, ticket.status);
    }

    this.pushActivityLog({
      action: 'ADD_PAYMENT',
      ticketId,
      customerId: ticket?.customerId,
      description: `Recorded payment of ${Number(res.data.amount).toLocaleString()} ${res.data.currency} via ${res.data.method} (${res.data.reference}).`
    });
    this.notify();
    return res;
  }

  // --- Flight Modification Actions ---
  async addModification(ticketId, modData) {
    const res = await apiClient.post(`/tickets/${ticketId}/modifications`, modData);
    if (!res.success) return res;

    const ticket = this.state.tickets.find(t => t.id === ticketId);
    if (ticket) {
      if (!Array.isArray(ticket.modifications)) ticket.modifications = [];
      ticket.modifications.push(res.data);
      if (modData.newDepartureDate) ticket.departureDate = modData.newDepartureDate;
      if (modData.newArrivalDate) ticket.arrivalDate = modData.newArrivalDate;
    }

    this.pushActivityLog({
      action: 'MODIFY_FLIGHT',
      ticketId,
      customerId: ticket?.customerId,
      description: `Added flight modification for ${ticketId} with change fee ${res.data.changeFee} ${res.data.currency}. Reason: ${res.data.reason}`
    });
    this.notify();
    return res;
  }

  // --- Refund Actions ---
  async addRefund(ticketId, refundData) {
    const res = await apiClient.post(`/tickets/${ticketId}/refunds`, refundData);
    if (!res.success) return res;

    const ticket = this.state.tickets.find(t => t.id === ticketId);
    if (ticket) {
      if (!Array.isArray(ticket.refunds)) ticket.refunds = [];
      ticket.refunds.push(res.data);
      ticket.status = res.data.status === 'COMPLETED' ? 'REFUNDED' : 'REFUND REQUESTED';
    }

    this.pushActivityLog({
      action: res.data.status === 'COMPLETED' ? 'COMPLETE_REFUND' : 'ADD_REFUND',
      ticketId,
      customerId: ticket?.customerId,
      description: `Processed refund of ${Number(res.data.amount).toLocaleString()} ${res.data.currency} for ${ticketId}. Reason: ${res.data.reason}`
    });
    this.notify();
    return res;
  }

  // --- Customer Actions ---
  async createCustomer(custData) {
    const res = await apiClient.post('/customers', custData);
    if (!res.success) return res;

    this.state.customers.unshift(res.data);
    this.pushActivityLog({
      action: 'UPDATE_CUSTOMER',
      ticketId: null,
      customerId: res.data.id,
      description: `Created new customer record for ${res.data.name} (${res.data.id}).`
    });
    this.notify();
    return res;
  }

  async updateCustomer(customerId, updates) {
    const res = await apiClient.patch(`/customers/${customerId}`, updates);
    if (!res.success) return res;

    const index = this.state.customers.findIndex(c => c.id === customerId);
    if (index !== -1) this.state.customers[index] = res.data;

    this.pushActivityLog({
      action: 'UPDATE_CUSTOMER',
      ticketId: null,
      customerId,
      description: `Updated profile for customer ${res.data.name}.`
    });
    this.notify();
    return res;
  }

  async addCustomerNote(customerId, noteText) {
    const res = await apiClient.post(`/customers/${customerId}/notes`, { text: noteText });
    if (!res.success) return res;

    const customer = this.state.customers.find(c => c.id === customerId);
    if (customer) {
      if (!Array.isArray(customer.notes)) customer.notes = [];
      customer.notes.unshift(res.data);
    }
    this.notify();
    return res;
  }

  // --- Employee Actions (ADMIN only) ---
  async addEmployee(empData) {
    const res = await apiClient.post('/employees', empData);
    if (!res.success) return res;

    this.state.employees.unshift(res.data);
    this.notify();
    return res;
  }

  // --- Activity Log (optimistic local append; backend is authoritative) ---
  pushActivityLog(logData) {
    const newLog = {
      id: `ACT-${Math.floor(900 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      user: this.state.currentUser?.name || 'Agent',
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
      updateStoredUser(data);
    }
    this.notify();
  }

  async saveSettings(section, data) {
    this.updateSettings(section, data);
    const res = await apiClient.patch('/settings', {
      [section]: this.state.settings[section]
    });
    return res;
  }
}

export const store = new Store();
