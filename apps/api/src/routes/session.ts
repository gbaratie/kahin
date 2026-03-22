import { Router } from 'express';
import {
  buildResultsCsvFilename,
  buildSessionResultsCsv,
} from '@kahin/qcm-application';
import {
  joinSessionUseCase,
  getSessionUseCase,
  submitAnswerUseCase,
  nextQuestionUseCase,
  advanceIfTimeUpUseCase,
  getQuizUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';
import { redactQuizForParticipant } from '../session/participantQuizView.js';
import {
  validateAnswerBody,
  validateJoinBody,
} from '../validation/sessionBody.js';

export const sessionRoutes = Router();

/** Quiz pour les participants (sans bonnes réponses encore secrètes). */
sessionRoutes.get(
  '/:id/quiz',
  handleAsync(async (req, res) => {
    const session = await getSessionUseCase.execute(req.params.id);
    if (!session) throw new Error('Session not found');
    const quiz = await getQuizUseCase.execute(session.quizId);
    res.json(redactQuizForParticipant(session, quiz));
  })
);

sessionRoutes.get(
  '/:id/results.csv',
  requireAdminAuth,
  handleAsync(async (req, res) => {
    const session = await getSessionUseCase.execute(req.params.id);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'finished') {
      throw new Error('Session is not finished');
    }
    const quiz = await getQuizUseCase.execute(session.quizId);
    const csv = buildSessionResultsCsv(session, quiz);
    const filename = buildResultsCsvFilename(quiz);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  })
);

sessionRoutes.get(
  '/:id',
  handleAsync(async (req, res) => {
    const session = await getSessionUseCase.execute(req.params.id);
    if (!session) throw new Error('Session not found');
    res.json(session);
  })
);

sessionRoutes.post(
  '/join',
  handleAsync(async (req, res) => {
    const joinInput = validateJoinBody(req.body);
    const result = await joinSessionUseCase.execute(joinInput);
    res.status(201).json(result);
  })
);

sessionRoutes.post(
  '/:id/answer',
  handleAsync(async (req, res) => {
    const payload = validateAnswerBody(req.params.id, req.body);
    await submitAnswerUseCase.execute(payload);
    res.status(204).send();
  })
);

sessionRoutes.post(
  '/:id/next',
  requireAdminAuth,
  handleAsync(async (req, res) => {
    const result = await nextQuestionUseCase.execute(req.params.id);
    res.json(result);
  })
);

sessionRoutes.post(
  '/:id/advance-if-time-up',
  handleAsync(async (req, res) => {
    const result = await advanceIfTimeUpUseCase.execute(req.params.id);
    if (result.advanced) res.json(result);
    else res.status(204).send();
  })
);
