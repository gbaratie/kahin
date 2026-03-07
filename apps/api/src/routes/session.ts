import { Router } from 'express';
import {
  joinSessionUseCase,
  getSessionUseCase,
  submitAnswerUseCase,
  nextQuestionUseCase,
  advanceIfTimeUpUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';

export const sessionRoutes = Router();

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
    const { code, participantName } = req.body;
    if (!code || !participantName) {
      throw new Error('code and participantName required');
    }
    const result = await joinSessionUseCase.execute({
      code: String(code).trim().toUpperCase(),
      participantName: String(participantName).trim() || 'Participant',
    });
    res.status(201).json(result);
  })
);

sessionRoutes.post(
  '/:id/answer',
  handleAsync(async (req, res) => {
    const { participantId, questionId, choiceId } = req.body;
    if (!participantId || !questionId || !choiceId) {
      throw new Error('participantId, questionId, choiceId required');
    }
    await submitAnswerUseCase.execute({
      sessionId: req.params.id,
      participantId: String(participantId),
      questionId: String(questionId),
      choiceId: String(choiceId),
    });
    res.status(204).send();
  })
);

sessionRoutes.post(
  '/:id/next',
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
