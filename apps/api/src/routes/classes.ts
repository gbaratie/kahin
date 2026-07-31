import { Router } from 'express';
import {
  listClassesUseCase,
  getClassUseCase,
  createClassUseCase,
  updateClassUseCase,
  deleteClassUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';
import {
  validateCreateClassBody,
  validateUpdateClassBody,
} from '../validation/classBody.js';

export const classRoutes = Router();

/** Liste publique (id, nom, effectif) pour le lancement de session. */
classRoutes.get(
  '/',
  handleAsync(async (_req, res) => {
    const classes = await listClassesUseCase.execute();
    res.json(classes);
  })
);

classRoutes.get(
  '/:classId',
  handleAsync(async (req, res) => {
    const schoolClass = await getClassUseCase.execute(req.params.classId);
    res.json(schoolClass);
  })
);

classRoutes.post(
  '/',
  requireAdminAuth,
  handleAsync(async (req, res) => {
    const input = validateCreateClassBody(req.body);
    const schoolClass = await createClassUseCase.execute(input);
    res.status(201).json(schoolClass);
  })
);

classRoutes.put(
  '/:classId',
  requireAdminAuth,
  handleAsync(async (req, res) => {
    const input = validateUpdateClassBody(req.body);
    const schoolClass = await updateClassUseCase.execute(
      req.params.classId,
      input
    );
    res.json(schoolClass);
  })
);

classRoutes.delete(
  '/:classId',
  requireAdminAuth,
  handleAsync(async (req, res) => {
    await deleteClassUseCase.execute(req.params.classId);
    res.status(204).send();
  })
);
