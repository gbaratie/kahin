import { Router } from 'express';
import {
  createQuizUseCase,
  updateQuizUseCase,
  deleteQuizUseCase,
  getQuizUseCase,
  launchSessionUseCase,
  listQuizzesUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import { validateQuizBody } from '../validation/quizBody.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';

export const quizRoutes = Router();

quizRoutes.use(requireAdminAuth);

quizRoutes.get(
  '/',
  handleAsync(async (_req, res) => {
    const quizzes = await listQuizzesUseCase.execute();
    res.json(quizzes);
  })
);

quizRoutes.get(
  '/:quizId',
  handleAsync(async (req, res) => {
    const quiz = await getQuizUseCase.execute(req.params.quizId);
    res.json(quiz);
  })
);

quizRoutes.post(
  '/',
  handleAsync(async (req, res) => {
    const input = validateQuizBody(req.body);
    const quiz = await createQuizUseCase.execute(input);
    res.status(201).json(quiz);
  })
);

quizRoutes.put(
  '/:quizId',
  handleAsync(async (req, res) => {
    const { quizId } = req.params;
    const input = validateQuizBody(req.body);
    const quiz = await updateQuizUseCase.execute(quizId, input);
    res.json(quiz);
  })
);

quizRoutes.post(
  '/:quizId/launch',
  handleAsync(async (req, res) => {
    const { quizId } = req.params;
    const session = await launchSessionUseCase.execute(quizId);
    res.status(201).json(session);
  })
);

quizRoutes.delete(
  '/:quizId',
  handleAsync(async (req, res) => {
    const { quizId } = req.params;
    await deleteQuizUseCase.execute(quizId);
    res.status(204).send();
  })
);
