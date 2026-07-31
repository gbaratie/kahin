import { Router } from 'express';
import {
  getStudentRosterUseCase,
  updateStudentRosterUseCase,
} from '../container.js';
import { handleAsync } from '../middleware/handleAsync.js';
import { requireAdminAuth } from '../middleware/requireAdminAuth.js';
import { validateRosterBody } from '../validation/rosterBody.js';

export const rosterRoutes = Router();

/** Liste publique : les élèves doivent pouvoir choisir leur nom sans auth. */
rosterRoutes.get(
  '/',
  handleAsync(async (_req, res) => {
    const roster = await getStudentRosterUseCase.execute();
    res.json(roster);
  })
);

rosterRoutes.put(
  '/',
  requireAdminAuth,
  handleAsync(async (req, res) => {
    const input = validateRosterBody(req.body);
    const roster = await updateStudentRosterUseCase.execute(input);
    res.json(roster);
  })
);
