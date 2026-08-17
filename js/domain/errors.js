/**
 * AfricaTravel — Domain & Application Error Classes
 *
 * Categorized errors for structured domain validation and user feedback.
 */

export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null, details = {}) {
    super(message, 'VALIDATION_ERROR', { field, ...details });
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class BusinessRuleError extends AppError {
  constructor(message, rule = null, details = {}) {
    super(message, 'BUSINESS_RULE_ERROR', { rule, ...details });
    this.name = 'BusinessRuleError';
    this.rule = rule;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = '') {
    super(`${resource}${id ? ` #${id}` : ''} not found`, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}
