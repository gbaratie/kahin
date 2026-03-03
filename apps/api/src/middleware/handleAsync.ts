import type { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wrapper pour les handlers async : rejette vers le middleware d'erreur.
 */
export function handleAsync(fn: AsyncRequestHandler): AsyncRequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
