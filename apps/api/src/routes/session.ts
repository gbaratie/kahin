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
    const { participantId, questionId, choiceId, word } = req.body;
    if (!participantId || !questionId) {
      throw new Error('participantId and questionId required');
    }
    if (choiceId != null && word != null) {
      throw new Error(
        'provide either choiceId (QCM) or word (nuage de mots), not both'
      );
    }
    if (choiceId == null && word == null) {
      throw new Error('choiceId (QCM) or word (nuage de mots) required');
    }
    const payload: {
      sessionId: string;
      participantId: string;
      questionId: string;
      choiceId?: string;
      word?: string;
    } = {
      sessionId: req.params.id,
      participantId: String(participantId),
      questionId: String(questionId),
    };
    if (choiceId != null) payload.choiceId = String(choiceId);
    if (word != null) payload.word = String(word).trim();
    await submitAnswerUseCase.execute(payload);
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
