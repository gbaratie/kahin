import { Router } from 'express';
import {
  listQuestionsUseCase,
  getQuestionUseCase,
  saveQuestionUseCase,
  deleteQuestionUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import { validateQuestionBody } from '../validation/questionBody.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';

export const questionRoutes = Router();

questionRoutes.use(requireAdminAuth);

questionRoutes.get(
  '/',
  handleAsync(async (req, res) => {
    const themeIdParam = req.query.themeId;
    let themeId: string | null | undefined;
    if (themeIdParam === 'null' || themeIdParam === '') {
      themeId = null;
    } else if (typeof themeIdParam === 'string') {
      themeId = themeIdParam;
    }
    const summaries = req.query.summaries === '1' || req.query.summaries === 'true';
    const sortParam = req.query.sort;
    const sort =
      sortParam === 'theme' || sortParam === 'label' ? sortParam : 'label';
    const result = await listQuestionsUseCase.execute({
      themeId,
      summaries,
      sort,
    });
    res.json(result);
  })
);

questionRoutes.get(
  '/:questionId',
  handleAsync(async (req, res) => {
    const question = await getQuestionUseCase.execute(req.params.questionId);
    res.json(question);
  })
);

questionRoutes.post(
  '/',
  handleAsync(async (req, res) => {
    const input = validateQuestionBody(req.body ?? {});
    const question = await saveQuestionUseCase.execute(input);
    res.status(201).json(question);
  })
);

questionRoutes.put(
  '/:questionId',
  handleAsync(async (req, res) => {
    const input = validateQuestionBody({
      ...(req.body ?? {}),
      id: req.params.questionId,
    });
    const question = await saveQuestionUseCase.execute(input);
    res.json(question);
  })
);

questionRoutes.delete(
  '/:questionId',
  handleAsync(async (req, res) => {
    await deleteQuestionUseCase.execute(req.params.questionId);
    res.status(204).send();
  })
);
