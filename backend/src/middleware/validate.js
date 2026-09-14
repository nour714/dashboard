/**
 * AfricaTravel - Request Validation Middleware using Zod
 */

import { ValidationError } from '../domain/errors.js';

/**
 * Creates an Express middleware to validate request components against Zod schemas
 * @param {{ body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schemas
 */
export function validate(schemas = {}) {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        const parsedBody = await schemas.body.safeParseAsync(req.body);
        if (!parsedBody.success) {
          const firstIssue = parsedBody.error.issues[0];
          const field = firstIssue.path.join('.');
          throw new ValidationError(firstIssue.message, field, {
            issues: parsedBody.error.issues
          });
        }
        req.body = parsedBody.data;
      }

      if (schemas.query) {
        const parsedQuery = await schemas.query.safeParseAsync(req.query);
        if (!parsedQuery.success) {
          const firstIssue = parsedQuery.error.issues[0];
          const field = firstIssue.path.join('.');
          throw new ValidationError(firstIssue.message, field, {
            issues: parsedQuery.error.issues
          });
        }
        // Express 5 defines `req.query` as a getter-only property on the
        // prototype (no setter), so a plain `req.query = ...` assignment
        // throws "Cannot set property query of #<IncomingMessage> which
        // has only a getter". Object.defineProperty creates an own,
        // writable property on this specific request instance instead,
        // which shadows the prototype getter without touching it.
        Object.defineProperty(req, 'query', {
          value: parsedQuery.data,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }

      if (schemas.params) {
        const parsedParams = await schemas.params.safeParseAsync(req.params);
        if (!parsedParams.success) {
          const firstIssue = parsedParams.error.issues[0];
          const field = firstIssue.path.join('.');
          throw new ValidationError(firstIssue.message, field, {
            issues: parsedParams.error.issues
          });
        }
        req.params = parsedParams.data;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
