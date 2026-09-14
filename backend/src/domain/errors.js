/**
 * AfricaTravel - Backend Domain & Application Error Classes
 *
 * Provides typed, structured error classes for domain validation, business rules,
 * authentication, and authorization.
 */

export class AppError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {number} statusCode
   * @param {object} details
   */
  constructor(message, code = 'APP_ERROR', statusCode = 500, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {string|null} field
   * @param {object} details
   */
  constructor(message, field = null, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...details });
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class BusinessRuleError extends AppError {
  /**
   * @param {string} message
   * @param {string|null} rule
   * @param {object|number} detailsOrStatus
   * @param {object} details
   */
  constructor(message, rule = null, detailsOrStatus = {}, details = {}) {
    const statusCode = typeof detailsOrStatus === 'number' ? detailsOrStatus : (details?.statusCode || 400);
    const finalDetails = typeof detailsOrStatus === 'object' && detailsOrStatus !== null ? detailsOrStatus : details;
    super(message, rule || 'BUSINESS_RULE_ERROR', statusCode, { rule, ...finalDetails });
    this.name = 'BusinessRuleError';
    this.rule = rule;
  }
}

export class NotFoundError extends AppError {
  /**
   * @param {string} resource
   * @param {string|number} id
   */
  constructor(resource = 'Resource', id = '') {
    super(`${resource}${id ? ` #${id}` : ''} not found`, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  /**
   * @param {string} message
   * @param {string} code
   */
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, code, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  /**
   * @param {string} message
   * @param {string} code
   */
  constructor(message = 'Access denied: insufficient permissions', code = 'FORBIDDEN') {
    super(message, code, 403);
    this.name = 'ForbiddenError';
  }
}
