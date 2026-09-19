import { Router, type IRouter } from "express";
import {
  PauseSimulationResponse,
  ResetSimulationResponse,
  StartSimulationResponse,
} from "@workspace/api-zod";
import { simulationEngine } from "../services/simulationEngine";

const router: IRouter = Router();

router.post("/simulation/start", (_req, res): void => {
  res.json(
    StartSimulationResponse.parse({
      simulationRunning: simulationEngine.start(),
      timestamp: new Date().toISOString(),
    }),
  );
});

router.post("/simulation/pause", (_req, res): void => {
  res.json(
    PauseSimulationResponse.parse({
      simulationRunning: simulationEngine.pause(),
      timestamp: new Date().toISOString(),
    }),
  );
});

router.post("/simulation/reset", (_req, res): void => {
  res.json(
    ResetSimulationResponse.parse({
      simulationRunning: simulationEngine.reset(),
      timestamp: new Date().toISOString(),
    }),
  );
});

export default router;