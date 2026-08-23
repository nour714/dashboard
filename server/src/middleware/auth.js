/**
 * AfricaTravel - Authentication & Authorization Middleware
 *
 * Enforces JWT verification, token extraction, and Role-Based Access Control (RBAC).
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../domain/errors.js';

/**
 * Authenticates request using JWT Bearer token
 */
export function authenticate(req, res, next) {
  let token;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Malformed authorization header');
    }
  } catch (err) {
    return next(err);
  }

  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Session token has expired. Please refresh token or log in again.', 'TOKEN_EXPIRED'));
      }
      return next(new UnauthorizedError('Invalid authentication token', 'INVALID_TOKEN'));
    }

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      title: decoded.title
    };
    next();
  });
}

/**
 * Optional authentication middleware for endpoints with public + private branches
 */
export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.user = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        title: decoded.title
      };
    } else {
      req.user = null;
    }
    next();
  });
}

/**
 * Role-Based Access Control (RBAC) middleware
 * @param {string|string[]} roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const allowedRoles = roles.flat();
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access restricted to roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
}
