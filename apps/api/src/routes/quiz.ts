import { Router } from 'express';
import {
  createQuizUseCase,
  getQuizById,
  launchSessionUseCase,
  listQuizzes,
} from '../container.js';

export const quizRoutes = Router();

quizRoutes.get('/', async (_req, res) => {
  try {
    const quizzes = await listQuizzes();
    res.json(quizzes);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'List quizzes failed' });
  }
});

quizRoutes.get('/:quizId', async (req, res) => {
  try {
    const quiz = await getQuizById(req.params.quizId);
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    res.json(quiz);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Get quiz failed' });
  }
});

quizRoutes.post('/', async (req, res) => {
  try {
    const { title, questions } = req.body;
    if (!title || !Array.isArray(questions)) {
      res.status(400).json({ error: 'title and questions required' });
      return;
    }
    const quiz = await createQuizUseCase.execute({
      title: String(title),
      questions: questions.map(
        (q: { label: string; choices: Array<{ label: string }> }) => ({
          label: String(q?.label ?? ''),
          choices: (q?.choices ?? []).map((c: { label: string }) => ({
            label: String(c?.label ?? ''),
          })),
        })
      ),
    });
    res.status(201).json(quiz);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Create quiz failed' });
  }
});

quizRoutes.post('/:quizId/launch', async (req, res) => {
  try {
    const { quizId } = req.params;
    const session = await launchSessionUseCase.execute(quizId);
    res.status(201).json(session);
  } catch (e) {
    if (e instanceof Error && e.message === 'Quiz not found') {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Launch failed' });
  }
});
