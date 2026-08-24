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
  },

  async uploadPassportDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No file uploaded. Please attach a passport document.',
            code: 'VALIDATION_ERROR'
          }
        });
      }
      const result = await CustomerService.uploadPassportDocument(
        req.params.id,
        req.file.buffer,
        req.file.mimetype,
        req.user
      );
      return res.status(200).json({
        success: true,
        data: { uploadedAt: result.uploadedAt }
      });
    } catch (err) {
      next(err);
    }
  },

  async getPassportDocument(req, res, next) {
    try {
      const result = await CustomerService.getPassportDocumentUrl(req.params.id);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async deletePassportDocument(req, res, next) {
    try {
      await CustomerService.deletePassportDocument(req.params.id, req.user);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async deleteCustomer(req, res, next) {
    try {
      const result = await CustomerService.deleteCustomer(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
