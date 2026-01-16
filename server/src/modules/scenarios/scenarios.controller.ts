import { Router, Request, Response } from 'express';
import { scenariosService } from './scenarios.service.js';

const router = Router();

// GET /api/scenarios - Get all scenarios
router.get('/', (_req: Request, res: Response) => {
  const scenarios = scenariosService.getAllScenarios();
  res.json({ scenarios });
});

// GET /api/scenarios/roles - Get all roles (must be before :id route)
router.get('/roles', (_req: Request, res: Response) => {
  const roles = scenariosService.getAllRoles();
  res.json({ roles });
});

// GET /api/scenarios/random - Get random scenario for role
router.get('/random', (req: Request, res: Response) => {
  const role = req.query.role as string;

  if (!role) {
    res.status(400).json({ error: 'Role query parameter required' });
    return;
  }

  const scenario = scenariosService.getRandomScenarioForRole(role);

  if (!scenario) {
    res.status(404).json({ error: `No scenarios found for role: ${role}` });
    return;
  }

  res.json({ scenario });
});

// GET /api/scenarios/:id - Get scenario by ID (must be last due to wildcard)
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const role = req.query.role as string;

  if (role) {
    const scenario = scenariosService.getScenarioWithPlayerTurns(id, role);
    if (!scenario) {
      res.status(404).json({ error: `Scenario not found: ${id}` });
      return;
    }
    res.json({ scenario });
  } else {
    const scenario = scenariosService.getScenarioById(id);
    if (!scenario) {
      res.status(404).json({ error: `Scenario not found: ${id}` });
      return;
    }
    res.json({ scenario });
  }
});

export const scenariosController = router;
