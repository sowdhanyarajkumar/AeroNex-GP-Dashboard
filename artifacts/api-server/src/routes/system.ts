import { Router, type IRouter } from "express";
import { GetSystemStatusResponse } from "@workspace/api-zod";
import { simulationEngine } from "../services/simulationEngine";

const router: IRouter = Router();

router.get("/system/status", (_req, res): void => {
  res.json(
    GetSystemStatusResponse.parse({
      online: true,
      simulationMode: true,
      simulationRunning: simulationEngine.isRunning,
      uptime: formatUptime(simulationEngine.uptimeMilliseconds),
      timestamp: new Date().toISOString(),
    }),
  );
});

function formatUptime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export default router;