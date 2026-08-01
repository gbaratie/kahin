import { Router } from 'express';
import {
  getClassGradesMacroUseCase,
  getClassQuizGradeDetailUseCase,
  updateGradeAnswersUseCase,
  updateQuizCoefficientUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';

export const gradeRoutes = Router();

gradeRoutes.use(requireAdminAuth);

gradeRoutes.get(
  '/classes/:classId',
  handleAsync(async (req, res) => {
    const result = await getClassGradesMacroUseCase.execute(
      req.params.classId
    );
    res.json(result);
  })
);

gradeRoutes.get(
  '/classes/:classId/quizzes/:quizId',
  handleAsync(async (req, res) => {
    const attemptId =
      typeof req.query.attemptId === 'string' && req.query.attemptId.trim()
        ? req.query.attemptId.trim()
        : undefined;
    const result = await getClassQuizGradeDetailUseCase.execute(
      req.params.classId,
      req.params.quizId,
      attemptId
    );
    res.json(result);
  })
);

gradeRoutes.patch(
  '/attempts/:attemptId/answers',
  handleAsync(async (req, res) => {
    const body = req.body as {
      updates?: Array<{
        studentName?: string;
        questionId?: string;
        isCorrect?: boolean;
        points?: number;
      }>;
    };
    if (!Array.isArray(body?.updates) || body.updates.length === 0) {
      throw new Error('updates required');
    }
    const updates = body.updates.map((u) => {
      if (!u?.studentName?.trim() || !u?.questionId?.trim()) {
        throw new Error('studentName and questionId required');
      }
      return {
        studentName: u.studentName.trim(),
        questionId: u.questionId.trim(),
        isCorrect: u.isCorrect,
        points: u.points,
      };
    });
    const result = await updateGradeAnswersUseCase.execute(
      req.params.attemptId,
      updates
    );
    res.json(result);
  })
);

gradeRoutes.patch(
  '/quizzes/:quizId/coefficient',
  handleAsync(async (req, res) => {
    const coefficient = Number((req.body as { coefficient?: unknown })?.coefficient);
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      throw new Error('coefficient must be a positive number');
    }
    await updateQuizCoefficientUseCase.execute(
      req.params.quizId,
      coefficient
    );
    res.json({ quizId: req.params.quizId, coefficient });
  })
);
