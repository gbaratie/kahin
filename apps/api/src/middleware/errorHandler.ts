import type { Request, Response, NextFunction } from 'express';
import { getErrorMessage } from '@kahin/shared-utils';

type ErrorWithCode = Error & { code?: string };

/** Erreurs client (requête invalide) — mappées en HTTP 400. */
const BAD_REQUEST_MESSAGES = new Set([
  'Session is already finished',
  'Session is not accepting answers',
  'Session is not finished',
  'Question not found or not current',
  'word required for word cloud question',
  'choiceId required for QCM question',
  'code and participantName required',
  'participantId and questionId required',
  'provide either choiceId (QCM) or word (nuage de mots), not both',
  'choiceId (QCM) or word (nuage de mots) required',
  'title and questions required',
]);

function getStatusForError(e: unknown): number {
  const message = getErrorMessage(e);
  const code = (e as ErrorWithCode)?.code;

  if (code === 'QUIZ_NOT_FOUND' || message === 'Quiz not found') return 404;
  if (message === 'Session not found') return 404;
  if (BAD_REQUEST_MESSAGES.has(message)) return 400;
  if (message === 'DATABASE_URL must be set to use PostgresQuizRepository.') {
    return 503;
  }
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
