import { Router } from 'express';
import { handleAsync } from '../middleware/handleAsync.js';
import {
  safeEqualUtf8,
  signAdminToken,
  TOKEN_TTL_SECONDS,
} from '../auth/adminToken.js';
import {
  getMicrosoftAuthConfig,
  isMicrosoftAuthConfigured,
  isMicrosoftAuthRequired,
} from '../auth/microsoftConfig.js';
import {
  buildFrontReturnUrl,
  buildMicrosoftAuthorizeRedirect,
  completeMicrosoftLogin,
} from '../auth/microsoftOAuth.js';
import { verifyOAuthState } from '../auth/participantToken.js';

export const authRoutes = Router();

authRoutes.post(
  '/login',
  handleAsync(async (req, res) => {
    const secret = process.env.ADMIN_AUTH_SECRET;
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    if (!secret || !expectedUser || !expectedPass) {
      res.status(503).json({
        error: 'Admin authentication not configured on server',
      });
      return;
    }
    const username =
      typeof req.body?.username === 'string' ? req.body.username : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
    if (
      !safeEqualUtf8(username, expectedUser) ||
      !safeEqualUtf8(password, expectedPass)
    ) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signAdminToken(secret, TOKEN_TTL_SECONDS);
    res.json({ token, expiresIn: TOKEN_TTL_SECONDS });
  })
);

/** Indique si la connexion Microsoft (comptes école) est disponible. */
authRoutes.get('/microsoft/status', (_req, res) => {
  res.json({
    enabled: isMicrosoftAuthConfigured(),
    required: isMicrosoftAuthRequired(),
  });
});

/**
 * Démarre le flux OAuth Microsoft pour les participants.
 * Query : returnPath (chemin front, défaut `/`), sessionCode (code session optionnel).
 */
authRoutes.get(
  '/microsoft',
  handleAsync(async (req, res) => {
    const cfg = getMicrosoftAuthConfig();
    if (!cfg || !process.env.ADMIN_AUTH_SECRET?.trim()) {
      res.status(503).json({
        error: 'Microsoft authentication not configured on server',
      });
      return;
    }
    const returnPathRaw =
      typeof req.query.returnPath === 'string' ? req.query.returnPath : '/';
    const returnPath = returnPathRaw.startsWith('/') ? returnPathRaw : '/';
    const sessionCode =
      typeof req.query.sessionCode === 'string'
        ? req.query.sessionCode.trim().toUpperCase()
        : '';
    const authorizeUrl = buildMicrosoftAuthorizeRedirect({
      returnPath,
      sessionCode,
    });
    if (!authorizeUrl) {
      res.status(503).json({
        error: 'Microsoft authentication not configured on server',
      });
      return;
    }
    res.redirect(302, authorizeUrl);
  })
);

authRoutes.get(
  '/microsoft/callback',
  handleAsync(async (req, res) => {
    const cfg = getMicrosoftAuthConfig();
    if (!cfg) {
      res.status(503).json({
        error: 'Microsoft authentication not configured on server',
      });
      return;
    }

    const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
    const state = stateRaw ? verifyOAuthState(stateRaw) : null;
    const returnPath = state?.returnPath ?? '/';
    const sessionCode = state?.sessionCode ?? '';

    const oauthError =
      typeof req.query.error === 'string' ? req.query.error : '';
    if (oauthError) {
      const desc =
        typeof req.query.error_description === 'string'
          ? req.query.error_description
          : oauthError;
      res.redirect(
        302,
        buildFrontReturnUrl({
          returnPath,
          sessionCode,
          error: desc.slice(0, 200),
        })
      );
      return;
    }

    if (!state) {
      res.redirect(
        302,
        buildFrontReturnUrl({
          returnPath: '/',
          sessionCode: '',
          error: 'Session Microsoft expirée. Réessayez.',
        })
      );
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) {
      res.redirect(
        302,
        buildFrontReturnUrl({
          returnPath,
          sessionCode,
          error: 'Code Microsoft manquant.',
        })
      );
      return;
    }

    try {
      const { token } = await completeMicrosoftLogin(code);
      res.redirect(
        302,
        buildFrontReturnUrl({
          returnPath,
          sessionCode,
          token,
        })
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Échec de la connexion Microsoft';
      res.redirect(
        302,
        buildFrontReturnUrl({
          returnPath,
          sessionCode,
          error: message.slice(0, 200),
        })
      );
    }
  })
);
