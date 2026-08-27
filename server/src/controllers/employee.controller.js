/**
 * AfricaTravel - Employee Management Controller
 */

import { EmployeeService } from '../services/employee.service.js';

export const EmployeeController = {
  async getEmployees(req, res, next) {
    try {
      const employees = await EmployeeService.getEmployees();
      return res.status(200).json({
        success: true,
        data: employees
      });
    } catch (err) {
      next(err);
    }
  },

  async getEmployeeById(req, res, next) {
    try {
      const employee = await EmployeeService.getEmployeeById(req.params.id);
      return res.status(200).json({
        success: true,
        data: employee
      });
    } catch (err) {
      next(err);
    }
  },

  async createEmployee(req, res, next) {
    try {
      const employee = await EmployeeService.createEmployee(req.body, req.user);
      return res.status(201).json({
        success: true,
        data: employee
      });
    } catch (err) {
      next(err);
    }
  },

  async updateEmployee(req, res, next) {
    try {
      const employee = await EmployeeService.updateEmployee(req.params.id, req.body, req.user);
      return res.status(200).json({
        success: true,
        data: employee
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteEmployee(req, res, next) {
    try {
      const result = await EmployeeService.deleteEmployee(req.params.id, req.user, req.body?.confirmEmployeeId);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
};
