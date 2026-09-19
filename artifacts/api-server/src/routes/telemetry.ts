import { desc } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetAlertsResponse,
  GetEnvironmentHistoryQueryParams,
  GetEnvironmentHistoryResponse,
  GetEnvironmentResponse,
  GetHealthHistoryQueryParams,
  GetHealthHistoryResponse,
  GetPredictiveHealthResponse,
  GetTrackingHistoryQueryParams,
  GetTrackingHistoryResponse,
  GetTrackingResponse,
} from "@workspace/api-zod";
import {
  alertsTable,
  db,
  environmentReadingsTable,
  healthReadingsTable,
  trackingReadingsTable,
} from "@workspace/db";
import { simulationEngine } from "../services/simulationEngine";

const router: IRouter = Router();

router.get("/environment", (_req, res): void => {
  res.json(GetEnvironmentResponse.parse(simulationEngine.current.environment));
});

router.get("/tracking", (_req, res): void => {
  res.json(GetTrackingResponse.parse(simulationEngine.current.tracking));
});

router.get("/health", (_req, res): void => {
  res.json(GetPredictiveHealthResponse.parse(simulationEngine.current.health));
});

router.get("/alerts", (_req, res): void => {
  res.json(GetAlertsResponse.parse(simulationEngine.currentAlerts));
});

router.get("/history/environment", async (req, res): Promise<void> => {
  const parsed = GetEnvironmentHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(environmentReadingsTable)
      .orderBy(desc(environmentReadingsTable.timestamp))
      .limit(parsed.data.limit);
    const history = rows.reverse().map((row) => ({
      timestamp: row.timestamp.toISOString(),
      temperature: row.temperature,
      pressure: row.pressure,
      humidity: row.humidity,
      vibration: row.vibration,
      condition: row.condition,
    }));
    res.json(GetEnvironmentHistoryResponse.parse(history.length ? history : simulationEngine.getHistory("environment", parsed.data.limit)));
  } catch (error) {
    req.log.warn({ err: error }, "Falling back to in-memory environment history");
    res.json(GetEnvironmentHistoryResponse.parse(simulationEngine.getHistory("environment", parsed.data.limit)));
  }
});

router.get("/history/health", async (req, res): Promise<void> => {
  const parsed = GetHealthHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(healthReadingsTable)
      .orderBy(desc(healthReadingsTable.timestamp))
      .limit(parsed.data.limit);
    const history = rows.reverse().map((row) => ({
      timestamp: row.timestamp.toISOString(),
      estimatedHealth: row.estimatedHealth,
      predictedHealth: row.predictedHealth,
      degradationRate: row.degradationRate,
      thermalState: row.thermalState,
      riskLevel: row.riskLevel,
    }));
    res.json(GetHealthHistoryResponse.parse(history.length ? history : simulationEngine.getHistory("health", parsed.data.limit)));
  } catch (error) {
    req.log.warn({ err: error }, "Falling back to in-memory health history");
    res.json(GetHealthHistoryResponse.parse(simulationEngine.getHistory("health", parsed.data.limit)));
  }
});

router.get("/history/tracking", async (req, res): Promise<void> => {
  const parsed = GetTrackingHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(trackingReadingsTable)
      .orderBy(desc(trackingReadingsTable.timestamp))
      .limit(parsed.data.limit);
    const history = rows.reverse().map((row) => ({
      timestamp: row.timestamp.toISOString(),
      targetDetected: row.status !== "LOST",
      targetX: row.targetX,
      targetY: row.targetY,
      confidence: row.confidence,
      trackingError: row.trackingError,
      bearing: row.bearing,
      elevation: row.elevation,
      range: row.range,
      status: row.status,
    }));
    res.json(GetTrackingHistoryResponse.parse(history.length ? history : simulationEngine.getHistory("tracking", parsed.data.limit)));
  } catch (error) {
    req.log.warn({ err: error }, "Falling back to in-memory tracking history");
    res.json(GetTrackingHistoryResponse.parse(simulationEngine.getHistory("tracking", parsed.data.limit)));
  }
});

export default router;