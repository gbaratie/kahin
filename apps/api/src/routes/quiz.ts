import { Router } from 'express';
import {
  createQuizUseCase,
  updateQuizUseCase,
  deleteQuiz,
  getQuizById,
  launchSessionUseCase,
  listQuizzes,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import { validateQuizBody } from '../validation/quizBody.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';

export const quizRoutes = Router();

quizRoutes.use(requireAdminAuth);

quizRoutes.get(
  '/',
  handleAsync(async (_req, res) => {
    const quizzes = await listQuizzes();
    res.json(quizzes);
  })
);

quizRoutes.get(
  '/:quizId',
  handleAsync(async (req, res) => {
    const quiz = await getQuizById(req.params.quizId);
    if (!quiz) throw new Error('Quiz not found');
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
    const quiz = await getQuizById(quizId);
    if (!quiz) throw new Error('Quiz not found');
    await deleteQuiz(quizId);
    res.status(204).send();
  })
);
