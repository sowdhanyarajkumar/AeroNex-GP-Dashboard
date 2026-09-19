import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const createdTimestamp = () =>
  timestamp("timestamp", { withTimezone: true }).notNull().defaultNow();

export const environmentReadingsTable = pgTable("environment_readings", {
  id: serial("id").primaryKey(),
  timestamp: createdTimestamp(),
  temperature: real("temperature").notNull(),
  pressure: real("pressure").notNull(),
  humidity: real("humidity").notNull(),
  vibration: real("vibration").notNull(),
  condition: text("condition").notNull(),
});

export const trackingReadingsTable = pgTable("tracking_readings", {
  id: serial("id").primaryKey(),
  timestamp: createdTimestamp(),
  targetX: real("target_x").notNull(),
  targetY: real("target_y").notNull(),
  confidence: real("confidence").notNull(),
  trackingError: real("tracking_error").notNull(),
  bearing: real("bearing").notNull(),
  elevation: real("elevation").notNull(),
  range: real("range").notNull(),
  status: text("status").notNull(),
});

export const healthReadingsTable = pgTable("health_readings", {
  id: serial("id").primaryKey(),
  timestamp: createdTimestamp(),
  estimatedHealth: real("estimated_health").notNull(),
  predictedHealth: real("predicted_health").notNull(),
  degradationRate: real("degradation_rate").notNull(),
  thermalState: text("thermal_state").notNull(),
  riskLevel: text("risk_level").notNull(),
});

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  timestamp: createdTimestamp(),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  acknowledged: integer("acknowledged").notNull().default(0),
});

export const systemEventsTable = pgTable("system_events", {
  id: serial("id").primaryKey(),
  timestamp: createdTimestamp(),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
});

export const insertEnvironmentReadingSchema = createInsertSchema(environmentReadingsTable).omit({ id: true, timestamp: true });
export const insertTrackingReadingSchema = createInsertSchema(trackingReadingsTable).omit({ id: true, timestamp: true });
export const insertHealthReadingSchema = createInsertSchema(healthReadingsTable).omit({ id: true, timestamp: true });
export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, timestamp: true });
export const insertSystemEventSchema = createInsertSchema(systemEventsTable).omit({ id: true, timestamp: true });

export type EnvironmentReadingRow = z.infer<typeof insertEnvironmentReadingSchema>;
export type TrackingReadingRow = z.infer<typeof insertTrackingReadingSchema>;
export type HealthReadingRow = z.infer<typeof insertHealthReadingSchema>;