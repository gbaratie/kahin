import type { Request, Response, NextFunction } from 'express';
import { getErrorMessage } from '@kahin/shared-utils';

type ErrorWithCode = Error & { code?: string };

function getStatusForError(e: unknown): number {
  const message = getErrorMessage(e);
  const code = (e as ErrorWithCode)?.code;

  if (code === 'QUIZ_NOT_FOUND' || message === 'Quiz not found') return 404;
  if (message === 'Session not found') return 404;
  if (
    message === 'Session is already finished' ||
    message === 'Session is not accepting answers' ||
    message === 'Session is not finished'
  )
    return 400;
  return 500;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = getErrorMessage(err);
  const status = getStatusForError(err);
  res.status(status).json({ error: message });
}
