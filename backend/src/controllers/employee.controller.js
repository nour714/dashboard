/**
 * AfricaTravel - Employee Management Controller
 */

import { EmployeeService } from '../services/employee.service.js';

function sanitizeEmployee(emp, isAdmin) {
  if (!emp || isAdmin) return emp;
  const sanitized = { ...emp };
  delete sanitized.grossProfit;
  delete sanitized.netProfit;
  delete sanitized.totalNetProfit;
  delete sanitized.modificationProfit;
  if (sanitized.byCurrency) {
    const cleanedByCurrency = {};
    for (const [curr, grp] of Object.entries(sanitized.byCurrency)) {
      const cleanedGrp = { ...grp };
      delete cleanedGrp.grossProfit;
      delete cleanedGrp.netProfit;
      delete cleanedGrp.modificationProfit;
      cleanedByCurrency[curr] = cleanedGrp;
    }
    sanitized.byCurrency = cleanedByCurrency;
  }
  return sanitized;
}

export const EmployeeController = {
  async getEmployees(req, res, next) {
    try {
      const employees = await EmployeeService.getEmployees();
      const isAdmin = req.user?.role === 'ADMIN';
      const data = employees.map(e => sanitizeEmployee(e, isAdmin));
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getEmployeeById(req, res, next) {
    try {
      const employee = await EmployeeService.getEmployeeById(req.params.id);
      const isAdmin = req.user?.role === 'ADMIN';
      const data = sanitizeEmployee(employee, isAdmin);
      return res.status(200).json({
        success: true,
        data
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
