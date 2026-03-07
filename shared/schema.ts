import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isDriver: boolean("is_driver").default(false),
  credits: integer("credits").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routineRoutes = pgTable("routine_routes", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  startTime: text("start_time").notNull(), // e.g. "08:00"
  endTime: text("end_time").notNull(),     // e.g. "09:00"
  days: jsonb("days").notNull(),           // e.g. ["Mon", "Tue"]
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shortHops = pgTable("short_hops", {
  id: serial("id").primaryKey(),
  walkerId: integer("walker_id").references(() => users.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  status: text("status").notNull(), // "requested", "matched", "completed", "cancelled"
  distanceMiles: text("distance_miles"), // e.g. "1.5"
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  routineRoutes: many(routineRoutes),
  hopsAsWalker: many(shortHops, { relationName: "walker" }),
  hopsAsDriver: many(shortHops, { relationName: "driver" }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, credits: true });
export const insertRoutineRouteSchema = createInsertSchema(routineRoutes).omit({ id: true, createdAt: true });
export const insertShortHopSchema = createInsertSchema(shortHops).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RoutineRoute = typeof routineRoutes.$inferSelect;
export type InsertRoutineRoute = z.infer<typeof insertRoutineRouteSchema>;

export type ShortHop = typeof shortHops.$inferSelect;
export type InsertShortHop = z.infer<typeof insertShortHopSchema>;

// API Contract Types
export type LoginRequest = z.infer<typeof insertUserSchema>;
export type RegisterRequest = z.infer<typeof insertUserSchema>;
export type CreateRouteRequest = Omit<InsertRoutineRoute, "driverId">;
export type UpdateRouteRequest = Partial<CreateRouteRequest>;
export type RequestHopRequest = Omit<InsertShortHop, "walkerId" | "driverId" | "status">;
export type AcceptHopRequest = { driverId: number };
export type CompleteHopRequest = { distanceMiles: string };
