import { Router } from 'express';
import { handleAsync } from '../middleware/handleAsync.js';
import {
  safeEqualUtf8,
  signAdminToken,
  TOKEN_TTL_SECONDS,
} from '../auth/adminToken.js';

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
