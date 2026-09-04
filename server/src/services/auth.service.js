/**
 * AfricaTravel - Authentication Service
 *
 * Implements JWT authentication, refresh token rotation, password hashing, and user sessions.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPrismaClient } from '../config/database.js';
import { env } from '../config/env.js';
import { UnauthorizedError, NotFoundError, BusinessRuleError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';

export const AuthService = {
  /**
   * Hashes a plaintext password using bcrypt (cost factor = 12)
   * @param {string} password
   * @param {number} [saltRounds=12]
   * @returns {Promise<string>}
   */
  async hashPassword(password, saltRounds = 12) {
    return bcrypt.hash(password, saltRounds);
  },

  /**
   * Compares a plaintext password with a bcrypt hash
   * @param {string} password
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  /**
   * Generates a short-lived access token
   * @param {object} user
   * @returns {string}
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  },

  /**
   * Generates a cryptographically secure refresh token
   * @returns {string}
   */
  generateRefreshTokenString() {
    return crypto.randomBytes(40).toString('hex');
  },

  /**
   * Hashes a refresh token before DB storage
   * @param {string} token
   * @returns {string}
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Authenticates a user by email and password
   * @param {string} email
   * @param {string} password
   * @param {object} meta - IP and UserAgent
   * @param {{ rememberMe?: boolean }} [options={}]
   * @returns {Promise<{user: object, accessToken: string, refreshToken: string, rememberMe: boolean}>}
   */
  async login(email, password, meta = {}, options = {}) {
    const prisma = getPrismaClient();
    const cleanEmail = email.trim();
    const rememberMe = options.rememberMe !== undefined ? Boolean(options.rememberMe) : true;

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive'
        }
      }
    });

    // Mitigate user enumeration: verify password before revealing any account status
    const isMatch = user ? await this.comparePassword(password, user.passwordHash) : false;
    if (!user || !isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') {
      throw new BusinessRuleError('Your account has been deactivated. Please contact an administrator.', 'ACCOUNT_INACTIVE');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const rawRefreshToken = this.generateRefreshTokenString();
    const tokenHash = this.hashToken(rawRefreshToken);

    // Calculate expiry (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store hashed refresh token in database
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        rememberMe,
        expiresAt
      }
    });

    // Update user's lastActive timestamp safely
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() }
    }).catch(e => console.warn('Could not update lastActive:', e.message));

    // Record audit event safely
    await AuditService.recordLog({
      user: user.name,
      userId: user.id,
      action: 'LOGIN',
      description: `User ${user.name} (${user.email}) logged in successfully.`,
      ip: meta.ip,
      userAgent: meta.userAgent
    }).catch(e => console.warn('Could not record login audit log:', e.message));

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      status: user.status
    };

    return {
      user: safeUser,
      accessToken,
      refreshToken: rawRefreshToken,
      rememberMe
    };
  },

  /**
   * Refreshes an expired access token using a valid refresh token.
   * Implements atomic token rotation with reuse family detection:
   * 1. Detects reuse of previously revoked tokens and revokes the whole family/session.
   * 2. Uses atomic updateMany where revoked = false to claim token (guaranteeing rowCount === 1).
   * 3. Creates the replacement token within the same transaction.
   * @param {string} rawRefreshToken
   * @returns {Promise<{accessToken: string, refreshToken: string, rememberMe: boolean}>}
   */
  async refresh(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const prisma = getPrismaClient();
    const tokenHash = this.hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
    }

    // Reuse Family Detection: If an already-revoked token is presented, someone is replaying/stealing tokens.
    // Invalidate all active tokens for this user immediately.
    if (tokenRecord.revoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { revoked: true }
      });
      throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked for security.', 'INVALID_REFRESH_TOKEN');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token is expired', 'INVALID_REFRESH_TOKEN');
    }

    if (tokenRecord.user.status !== 'ACTIVE') {
      throw new BusinessRuleError('Account is inactive', 'ACCOUNT_INACTIVE');
    }

    const rememberMe = tokenRecord.rememberMe !== undefined ? Boolean(tokenRecord.rememberMe) : true;

    // Atomic Claim: Ensure only 1 concurrent request can rotate this specific token
    const newRawRefreshToken = this.generateRefreshTokenString();
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const executeRotation = async (tx) => {
      const claimResult = await tx.refreshToken.updateMany({
        where: {
          id: tokenRecord.id,
          revoked: false
        },
        data: { revoked: true }
      });

      // Verify that exactly 1 row was updated (atomic claim succeeded)
      if (!claimResult || claimResult.count !== 1) {
        // Race condition / reuse conflict detected: revoke all tokens for this user
        await tx.refreshToken.updateMany({
          where: { userId: tokenRecord.userId },
          data: { revoked: true }
        });
        throw new UnauthorizedError('Refresh token already claimed or reused concurrently', 'INVALID_REFRESH_TOKEN');
      }

      // Create new replacement refresh token inside the same transaction
      await tx.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: tokenRecord.user.id,
          rememberMe,
          expiresAt
        }
      });
    };

    if (typeof prisma.$transaction === 'function') {
      await prisma.$transaction(executeRotation);
    } else {
      await executeRotation(prisma);
    }

    const newAccessToken = this.generateAccessToken(tokenRecord.user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      rememberMe
    };
  },

  /**
   * Revokes a refresh token and terminates the user session
   * @param {string} rawRefreshToken
   * @param {object} currentUser
   */
  async logout(rawRefreshToken, currentUser = null) {
    if (!rawRefreshToken) return { success: true };

    const prisma = getPrismaClient();
    const tokenHash = this.hashToken(rawRefreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true }
    });

    if (currentUser) {
      await AuditService.recordLog({
        user: currentUser.name || 'User',
        userId: currentUser.id,
        action: 'LOGOUT',
        description: `User ${currentUser.name} logged out.`
      });
    }

    return { success: true };
  },

  /**
   * Retrieves full profile for the currently authenticated user
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getCurrentUserProfile(userId) {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        status: true,
        lastActive: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  },

  /**
   * Updates profile data for a user
   * @param {string} userId
   * @param {{ name?: string, email?: string, title?: string, phone?: string }} data
   */
  async updateProfile(userId, data) {
    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundError('User', userId);
    }

    const updateData = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.title) updateData.title = data.title.trim();
    if (data.email) {
      const cleanEmail = data.email.toLowerCase().trim();
      if (cleanEmail !== existing.email.toLowerCase()) {
        const duplicate = await prisma.user.findFirst({
          where: {
            email: { equals: cleanEmail, mode: 'insensitive' },
            id: { not: userId }
          }
        });
        if (duplicate) {
          throw new BusinessRuleError('A user with this email address already exists.', 'EMAIL_EXISTS');
        }
        updateData.email = cleanEmail;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        status: true,
        lastActive: true
      }
    });

    await AuditService.recordLog({
      user: updated.name,
      userId: updated.id,
      action: 'UPDATE_PROFILE',
      description: `User ${updated.name} updated profile settings.`
    });

    return updated;
  },

  /**
   * Changes password for an authenticated user
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword(userId, currentPassword, newPassword) {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const isMatch = await this.comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
    }

    const newHash = await this.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    // Revoke all existing refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true }
    });

    await AuditService.recordLog({
      user: user.name,
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      description: `User ${user.name} changed their password.`
    });

    return { success: true };
  },

  /**
   * Revokes all active refresh tokens for a user except the current session token
   * @param {string} userId
   * @param {string} [currentRawRefreshToken]
   * @returns {Promise<{success: boolean, revokedCount: number}>}
   */
  async revokeOtherSessions(userId, currentRawRefreshToken = null) {
    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    const prisma = getPrismaClient();
    const where = {
      userId,
      revoked: false
    };

    if (currentRawRefreshToken) {
      const currentTokenHash = this.hashToken(currentRawRefreshToken);
      where.tokenHash = { not: currentTokenHash };
    }

    const result = await prisma.refreshToken.updateMany({
      where,
      data: { revoked: true }
    });

    await AuditService.recordLog({
      user: userId,
      userId,
      action: 'REVOKE_OTHER_SESSIONS',
      description: `Revoked all other active sessions (${result?.count || 0} session(s) revoked).`
    }).catch(e => console.warn('Could not record revoke sessions audit log:', e.message));

    return { success: true, revokedCount: result?.count || 0 };
  }
};
