import { Router, type IRouter } from "express";
import {
  GetControlStateResponse,
  SetCameraPositionBody,
  SetCameraPositionResponse,
  SetTrackingModeBody,
  SetTrackingModeResponse,
} from "@workspace/api-zod";
import { simulationEngine } from "../services/simulationEngine";

const router: IRouter = Router();

router.get("/control", (_req, res): void => {
  res.json(GetControlStateResponse.parse(simulationEngine.current.control));
});

router.post("/control/tracking", (req, res): void => {
  const parsed = SetTrackingModeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(SetTrackingModeResponse.parse(simulationEngine.setTrackingMode(parsed.data.mode)));
});

router.post("/control/camera", (req, res): void => {
  const parsed = SetCameraPositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const control = simulationEngine.setCamera(parsed.data.pan, parsed.data.tilt);
  res.json(SetCameraPositionResponse.parse({ pan: control.pan, tilt: control.tilt }));
});

export default router;