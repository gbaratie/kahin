import { Router } from 'express';
import {
  createThemeUseCase,
  updateThemeUseCase,
  deleteThemeUseCase,
  listThemesUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import {
  validateThemeCreateBody,
  validateThemeUpdateBody,
} from '../validation/themeBody.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';

export const themeRoutes = Router();

themeRoutes.use(requireAdminAuth);

themeRoutes.get(
  '/',
  handleAsync(async (_req, res) => {
    const themes = await listThemesUseCase.execute();
    res.json(themes);
  })
);

themeRoutes.post(
  '/',
  handleAsync(async (req, res) => {
    const input = validateThemeCreateBody(req.body ?? {});
    const theme = await createThemeUseCase.execute(input);
    res.status(201).json(theme);
  })
);

themeRoutes.put(
  '/:themeId',
  handleAsync(async (req, res) => {
    const input = validateThemeUpdateBody(req.body ?? {});
    const theme = await updateThemeUseCase.execute(req.params.themeId, input);
    res.json(theme);
  })
);

themeRoutes.delete(
  '/:themeId',
  handleAsync(async (req, res) => {
    await deleteThemeUseCase.execute(req.params.themeId);
    res.status(204).send();
  })
);
