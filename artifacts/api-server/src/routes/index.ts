import { Router, type IRouter } from "express";
import healthRouter from "./health";
import controlRouter from "./control";
import simulationRouter from "./simulation";
import systemRouter from "./system";
import telemetryRouter from "./telemetry";

const router: IRouter = Router();

router.use(healthRouter);
router.use(systemRouter);
router.use(telemetryRouter);
router.use(simulationRouter);
router.use(controlRouter);

export default router;
