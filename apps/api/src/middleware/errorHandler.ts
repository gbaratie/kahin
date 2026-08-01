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
  'numberValue required for closest question',
  'expectedNumber required for closest question',
  'code and participantName required',
  'participantId and questionId required',
  'provide either choiceId (QCM) or word (nuage de mots), not both',
  'choiceId (QCM) or word (nuage de mots) required',
  'provide either choiceId (QCM), word (nuage de mots) or numberValue (au plus proche), not several',
  'choiceId (QCM), word (nuage de mots) or numberValue (au plus proche) required',
  'title and questions required',
  'names required',
  'class name required',
  'Name not in student roster',
  'session code required',
  'name required',
  'label required',
  'Theme name required',
  'Question label required',
  'updates required',
  'studentName and questionId required',
  'coefficient must be a positive number',
]);

function getStatusForError(e: unknown): number {
  const message = getErrorMessage(e);
  const code = (e as ErrorWithCode)?.code;

  if (code === 'QUIZ_NOT_FOUND' || message === 'Quiz not found') return 404;
  if (code === 'THEME_NOT_FOUND' || message === 'Theme not found') return 404;
  if (code === 'QUESTION_NOT_FOUND' || message === 'Question not found')
    return 404;
  if (code === 'GRADE_NOT_FOUND' || message === 'Grade attempt not found')
    return 404;
  if (code === 'CLASS_NOT_FOUND' || message === 'Class not found') return 404;
  if (message === 'Session not found') return 404;
  if (message === 'Class not found') return 404;
  if (BAD_REQUEST_MESSAGES.has(message)) return 400;
  if (
    message === 'DATABASE_URL must be set to use PostgresQuizRepository.' ||
    message === 'DATABASE_URL must be set to use Postgres repositories.'
  ) {
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
