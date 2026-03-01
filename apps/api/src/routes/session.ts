import { Router } from 'express';
import {
  joinSessionUseCase,
  getSessionUseCase,
  submitAnswerUseCase,
  nextQuestionUseCase,
} from '../container.js';

export const sessionRoutes = Router();

sessionRoutes.get('/:id', async (req, res) => {
  try {
    const session = await getSessionUseCase.execute(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Get session failed' });
  }
});

sessionRoutes.post('/join', async (req, res) => {
  try {
    const { code, participantName } = req.body;
    if (!code || !participantName) {
      res.status(400).json({ error: 'code and participantName required' });
      return;
    }
    const result = await joinSessionUseCase.execute({
      code: String(code).trim().toUpperCase(),
      participantName: String(participantName).trim() || 'Participant',
    });
    res.status(201).json(result);
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'Session not found' ||
        e.message === 'Session is already finished')
    ) {
      res.status(400).json({ error: e.message });
      return;
    }
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Join failed' });
  }
});

sessionRoutes.post('/:id/answer', async (req, res) => {
  try {
    const { participantId, questionId, choiceId } = req.body;
    if (!participantId || !questionId || !choiceId) {
      res
        .status(400)
        .json({ error: 'participantId, questionId, choiceId required' });
      return;
    }
    await submitAnswerUseCase.execute({
      sessionId: req.params.id,
      participantId: String(participantId),
      questionId: String(questionId),
      choiceId: String(choiceId),
    });
    res.status(204).send();
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'Session not found' ||
        e.message === 'Session is not accepting answers')
    ) {
      res.status(400).json({ error: e.message });
      return;
    }
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Submit answer failed' });
  }
});

sessionRoutes.post('/:id/next', async (req, res) => {
  try {
    const result = await nextQuestionUseCase.execute(req.params.id);
    res.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === 'Session not found') {
      res.status(404).json({ error: e.message });
      return;
    }
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Next question failed' });
  }
});
