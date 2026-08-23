import { AuthService } from '../services/auth.service.js';
import { ValidationError } from '../domain/errors.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

export const AuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const meta = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      const result = await AuthService.login(email, password, meta);

      if (result.refreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
      }

      return res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      if (!rawToken) {
        throw new ValidationError('Refresh token is required', 'refreshToken');
      }

      const result = await AuthService.refresh(rawToken);

      if (result.refreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
      }

      return res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      await AuthService.logout(rawToken, req.user);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth'
      });

      return res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await AuthService.getCurrentUserProfile(req.user.id);
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }
};
