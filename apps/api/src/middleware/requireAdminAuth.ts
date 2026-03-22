import type { RequestHandler } from 'express';
import { verifyAdminToken } from '../auth/adminToken.js';

export const requireAdminAuth: RequestHandler = (req, res, next) => {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) {
    res
      .status(503)
      .json({ error: 'Admin authentication not configured on server' });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = auth.slice(7).trim();
  if (!token || !verifyAdminToken(secret, token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
