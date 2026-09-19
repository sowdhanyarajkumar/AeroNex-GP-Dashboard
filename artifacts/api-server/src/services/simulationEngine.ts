import { db } from "@workspace/db";
import {
  alertsTable,
  environmentReadingsTable,
  healthReadingsTable,
  systemEventsTable,
  trackingReadingsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

export type EnvironmentReading = {
  timestamp: string;
  temperature: number;
  pressure: number;
  humidity: number;
  vibration: number;
  condition: "NOMINAL" | "CAUTION" | "WARNING";
};

export type TrackingReading = {
  timestamp: string;
  targetDetected: boolean;
  targetX: number;
  targetY: number;
  confidence: number;
  trackingError: number;
  bearing: number;
  elevation: number;
  range: number;
  status: "STABLE" | "SEARCHING" | "LOST";
};

export type HealthReading = {
  timestamp: string;
  estimatedHealth: number;
  predictedHealth: number;
  degradationRate: number;
  thermalState: "NOMINAL" | "ELEVATED" | "CRITICAL";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

export type ControlState = {
  environmentalState: "NOMINAL" | "CAUTION" | "WARNING";
  operatingMode: "STANDARD" | "COMPENSATED" | "SAFE";
  adaptiveControl: boolean;
  recommendation: string;
  compensation: string;
  pan: number;
  tilt: number;
};

export type Alert = {
  id: string;
  timestamp: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  acknowledged: boolean;
};

type SimulationSnapshot = {
  environment: EnvironmentReading;
  tracking: TrackingReading;
  health: HealthReading;
  control: ControlState;
};

const MAX_HISTORY = 72;
const DEFAULT_ENVIRONMENT: Omit<EnvironmentReading, "timestamp" | "condition"> = {
  temperature: -23.8,
  pressure: 551.2,
  humidity: 31.8,
  vibration: 0.186,
};
const DEFAULT_TRACKING: Omit<TrackingReading, "timestamp" | "status"> = {
  targetDetected: true,
  targetX: 515,
  targetY: 216,
  confidence: 96.8,
  trackingError: 3.4,
  bearing: 207.7,
  elevation: 47.6,
  range: 966,
};
const DEFAULT_HEALTH: Omit<HealthReading, "timestamp" | "thermalState" | "riskLevel"> = {
  estimatedHealth: 87.6,
  predictedHealth: 88.2,
  degradationRate: 0,
};

const round = (value: number, digits = 1) =>
  Number(value.toFixed(digits));

const nowIso = () => new Date().toISOString();

const classifyEnvironment = (
  environment: Omit<EnvironmentReading, "timestamp" | "condition">,
): EnvironmentReading["condition"] => {
  if (
    environment.vibration > 0.32 ||
    environment.pressure < 538 ||
    environment.temperature < -31
  ) {
    return "WARNING";
  }
  if (
    environment.vibration > 0.245 ||
    environment.pressure < 545 ||
    environment.temperature < -28 ||
    environment.humidity > 54
  ) {
    return "CAUTION";
  }
  return "NOMINAL";
};

const initialSnapshot = (): SimulationSnapshot => {
  const timestamp = nowIso();
  const environment = { ...DEFAULT_ENVIRONMENT };
  const condition = classifyEnvironment(environment);
  return {
    environment: { ...environment, condition, timestamp },
    tracking: { ...DEFAULT_TRACKING, status: "STABLE", timestamp },
    health: { ...DEFAULT_HEALTH, thermalState: "NOMINAL", riskLevel: "LOW", timestamp },
    control: {
      environmentalState: condition,
      operatingMode: "STANDARD",
      adaptiveControl: true,
      compensation: "All systems nominal — no compensation required",
      recommendation: "All systems nominal. No adjustments required.",
      pan: 0,
      tilt: 0,
    },
  };
};

class SimulationEngine {
  private running = true;
  private startedAt = Date.now() - 23_000;
  private tick = 0;
  private snapshot = initialSnapshot();
  private environmentHistory: EnvironmentReading[] = [];
  private trackingHistory: TrackingReading[] = [];
  private healthHistory: HealthReading[] = [];
  private alerts: Alert[] = [];
  private interval: NodeJS.Timeout | undefined;

  constructor() {
    this.seedHistory();
    this.interval = setInterval(() => {
      if (this.running) {
        this.advance();
      }
    }, 2_000);
    void this.persistSnapshot();
  }

  get isRunning() {
    return this.running;
  }

  get uptimeMilliseconds() {
    return Date.now() - this.startedAt;
  }

  get current() {
    return this.snapshot;
  }

  get currentAlerts() {
    return this.alerts;
  }

  start() {
    this.running = true;
    return this.running;
  }

  pause() {
    this.running = false;
    return this.running;
  }

  reset() {
    this.running = true;
    this.startedAt = Date.now();
    this.tick = 0;
    this.snapshot = initialSnapshot();
    this.environmentHistory = [];
    this.trackingHistory = [];
    this.healthHistory = [];
    this.alerts = [];
    this.seedHistory();
    void this.persistSnapshot();
    return this.running;
  }

  setTrackingMode(mode: "AUTO" | "MANUAL") {
    const control = this.snapshot.control;
    this.snapshot = {
      ...this.snapshot,
      control: {
        ...control,
        operatingMode:
          mode === "MANUAL"
            ? "SAFE"
            : this.snapshot.environment.condition === "NOMINAL"
              ? "STANDARD"
              : "COMPENSATED",
        recommendation:
          mode === "MANUAL"
            ? "Manual tracking selected. Operator input is simulated only."
            : control.recommendation,
      },
    };
    return this.snapshot.control;
  }

  setCamera(pan: number, tilt: number) {
    this.snapshot = {
      ...this.snapshot,
      control: { ...this.snapshot.control, pan, tilt },
    };
    return this.snapshot.control;
  }

  getHistory(kind: "environment" | "tracking" | "health", limit: number) {
    const values =
      kind === "environment"
        ? this.environmentHistory
        : kind === "tracking"
          ? this.trackingHistory
          : this.healthHistory;
    return values.slice(-limit);
  }

  private seedHistory() {
    for (let index = 15; index >= 0; index -= 1) {
      this.advance(index * -1, false);
    }
  }

  private advance(offset = 0, shouldPersist = true) {
    this.tick += 1;
    const time = this.tick + offset;
    const timestamp = nowIso();
    const environmentBase = {
      temperature: DEFAULT_ENVIRONMENT.temperature + Math.sin(time / 8) * 2.4 + Math.sin(time / 19) * 0.7,
      pressure: DEFAULT_ENVIRONMENT.pressure + Math.sin(time / 12) * 5.8 - Math.cos(time / 21) * 2.2,
      humidity: DEFAULT_ENVIRONMENT.humidity + Math.sin(time / 10) * 7.5 + Math.cos(time / 17) * 2,
      vibration: DEFAULT_ENVIRONMENT.vibration + Math.abs(Math.sin(time / 6)) * 0.075 + Math.cos(time / 16) * 0.018,
    };
    const condition = classifyEnvironment(environmentBase);
    const trackingStatus: TrackingReading["status"] =
      condition === "WARNING" ? "SEARCHING" : "STABLE";
    const environment: EnvironmentReading = {
      ...Object.fromEntries(
        Object.entries(environmentBase).map(([key, value]) => [key, round(value as number, key === "vibration" ? 3 : 1)]),
      ) as Omit<EnvironmentReading, "timestamp" | "condition">,
      condition,
      timestamp,
    };
    const tracking: TrackingReading = {
      timestamp,
      targetDetected: true,
      targetX: round(DEFAULT_TRACKING.targetX + Math.sin(time / 5) * 64 + Math.cos(time / 13) * 18),
      targetY: round(DEFAULT_TRACKING.targetY + Math.cos(time / 7) * 34 + Math.sin(time / 15) * 11),
      confidence: round(Math.max(82, DEFAULT_TRACKING.confidence - (condition === "WARNING" ? 9 : condition === "CAUTION" ? 3 : 0) + Math.sin(time / 9) * 1.4), 1),
      trackingError: round(Math.max(1.2, DEFAULT_TRACKING.trackingError + (condition === "WARNING" ? 4 : condition === "CAUTION" ? 1.4 : 0) + Math.abs(Math.sin(time / 11)) * 1.3), 1),
      bearing: round((DEFAULT_TRACKING.bearing + Math.sin(time / 18) * 4.4 + 360) % 360, 1),
      elevation: round(DEFAULT_TRACKING.elevation + Math.cos(time / 16) * 2.8, 1),
      range: round(DEFAULT_TRACKING.range + Math.sin(time / 14) * 42 + Math.cos(time / 23) * 14, 0),
      status: trackingStatus,
    };
    const healthValue = Math.max(72, DEFAULT_HEALTH.estimatedHealth - (condition === "WARNING" ? 5 : condition === "CAUTION" ? 1.7 : 0) + Math.sin(time / 20) * 0.8);
    const health: HealthReading = {
      timestamp,
      estimatedHealth: round(healthValue, 1),
      predictedHealth: round(healthValue + (condition === "NOMINAL" ? 0.6 : -1.2), 1),
      degradationRate: round(condition === "WARNING" ? 0.09 : condition === "CAUTION" ? 0.03 : 0, 2),
      thermalState: condition === "WARNING" ? "ELEVATED" : "NOMINAL",
      riskLevel: condition === "WARNING" ? "HIGH" : condition === "CAUTION" ? "MEDIUM" : "LOW",
    };
    const control: ControlState = {
      ...this.snapshot.control,
      environmentalState: condition,
      operatingMode:
        condition === "WARNING"
          ? "SAFE"
          : condition === "CAUTION"
            ? "COMPENSATED"
            : this.snapshot.control.operatingMode === "SAFE"
              ? "STANDARD"
              : this.snapshot.control.operatingMode,
      compensation:
        condition === "WARNING"
          ? "Stability compensation recommended. Physical actuation is not connected."
          : condition === "CAUTION"
            ? "Increase stabilization margin and monitor vibration trend."
            : "All systems nominal — no compensation required",
      recommendation:
        condition === "WARNING"
          ? "Environmental warning. Hold simulated tracking corrections and review sensor margins."
          : condition === "CAUTION"
            ? "Caution state detected. Adaptive compensation is simulated and monitoring continues."
            : "All systems nominal. No adjustments required.",
    };
    this.snapshot = { environment, tracking, health, control };
    this.environmentHistory = [...this.environmentHistory, environment].slice(-MAX_HISTORY);
    this.trackingHistory = [...this.trackingHistory, tracking].slice(-MAX_HISTORY);
    this.healthHistory = [...this.healthHistory, health].slice(-MAX_HISTORY);
    this.updateAlerts(environment, tracking, health);
    if (shouldPersist && this.tick % 5 === 0) {
      void this.persistSnapshot();
    }
  }

  private updateAlerts(environment: EnvironmentReading, tracking: TrackingReading, health: HealthReading) {
    const next: Alert[] = [];
    if (environment.condition === "WARNING") {
      next.push(this.makeAlert("ENVIRONMENT WARNING", "CRITICAL", "Environmental margins exceed the simulated operating envelope."));
    } else if (environment.condition === "CAUTION") {
      next.push(this.makeAlert("ENVIRONMENT CAUTION", "WARNING", "Environmental conditions require simulated adaptive compensation."));
    } else {
      next.push(this.makeAlert("SYSTEM NOMINAL", "INFO", "All simulated environment and tracking systems are nominal."));
    }
    if (tracking.confidence < 88) {
      next.push(this.makeAlert("LOW CONFIDENCE", "WARNING", "Simulated target confidence is below the preferred threshold."));
    }
    if (health.riskLevel === "HIGH") {
      next.push(this.makeAlert("PREDICTIVE HEALTH RISK", "CRITICAL", "Simulated health model reports elevated degradation risk."));
    }
    this.alerts = next;
  }

  private makeAlert(type: string, severity: Alert["severity"], message: string): Alert {
    return {
      id: `${type.replaceAll(" ", "-").toLowerCase()}-${this.tick}`,
      timestamp: this.snapshot.environment.timestamp,
      type,
      severity,
      message,
      acknowledged: false,
    };
  }

  private async persistSnapshot() {
    try {
      await db.insert(environmentReadingsTable).values({
        timestamp: new Date(this.snapshot.environment.timestamp),
        temperature: this.snapshot.environment.temperature,
        pressure: this.snapshot.environment.pressure,
        humidity: this.snapshot.environment.humidity,
        vibration: this.snapshot.environment.vibration,
        condition: this.snapshot.environment.condition,
      });
      await db.insert(trackingReadingsTable).values({
        timestamp: new Date(this.snapshot.tracking.timestamp),
        targetX: this.snapshot.tracking.targetX,
        targetY: this.snapshot.tracking.targetY,
        confidence: this.snapshot.tracking.confidence,
        trackingError: this.snapshot.tracking.trackingError,
        bearing: this.snapshot.tracking.bearing,
        elevation: this.snapshot.tracking.elevation,
        range: this.snapshot.tracking.range,
        status: this.snapshot.tracking.status,
      });
      await db.insert(healthReadingsTable).values({
        timestamp: new Date(this.snapshot.health.timestamp),
        estimatedHealth: this.snapshot.health.estimatedHealth,
        predictedHealth: this.snapshot.health.predictedHealth,
        degradationRate: this.snapshot.health.degradationRate,
        thermalState: this.snapshot.health.thermalState,
        riskLevel: this.snapshot.health.riskLevel,
      });
      await db.insert(alertsTable).values(
        this.alerts.map((alert) => ({
          timestamp: new Date(alert.timestamp),
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          acknowledged: alert.acknowledged ? 1 : 0,
        })),
      );
      await db.insert(systemEventsTable).values({
        timestamp: new Date(),
        eventType: "SIMULATION_TICK",
        message: "Simulation telemetry persisted.",
      });
    } catch (error) {
      logger.warn({ err: error }, "Could not persist AeroNex simulation telemetry");
    }
  }
}

export const simulationEngine = new SimulationEngine();