/**
 * AfricaTravel - Customer Controller
 */

import { CustomerService } from '../services/customer.service.js';
import { NotFoundError } from '../domain/errors.js';

export const CustomerController = {
  async getCustomers(req, res, next) {
    try {
      const query = req.query.q || req.query.search || '';
      const customers = await CustomerService.getCustomers(query);
      return res.status(200).json({
        success: true,
        data: customers
      });
    } catch (err) {
      next(err);
    }
  },

  async getCustomerById(req, res, next) {
    try {
      const customer = await CustomerService.getCustomerById(req.params.id);
      if (!customer) {
        throw new NotFoundError('Customer', req.params.id);
      }
      return res.status(200).json({
        success: true,
        data: customer
      });
    } catch (err) {
      next(err);
    }
  },

  async createCustomer(req, res, next) {
    try {
      const customer = await CustomerService.createCustomer(req.body, req.user);
      return res.status(201).json({
        success: true,
        data: customer
      });
    } catch (err) {
      next(err);
    }
  },

  async updateCustomer(req, res, next) {
    try {
      const customer = await CustomerService.updateCustomer(req.params.id, req.body, req.user);
      return res.status(200).json({
        success: true,
        data: customer
      });
    } catch (err) {
      next(err);
    }
  },

  async addNote(req, res, next) {
    try {
      const note = await CustomerService.addNote(req.params.id, req.body.text, req.user);
      return res.status(201).json({
        success: true,
        data: note
      });
    } catch (err) {
      next(err);
    }
  }
};
