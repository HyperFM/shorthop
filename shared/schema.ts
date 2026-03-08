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
  isFlexibleDriver: boolean("is_flexible_driver").default(false),
  maxDetourDistance: text("max_detour_distance").default("1.0"),
  maxDetourTime: integer("max_detour_time").default(15),
  detourAvailable: boolean("detour_available").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routineRoutes = pgTable("routine_routes", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  days: jsonb("days").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shortHops = pgTable("short_hops", {
  id: serial("id").primaryKey(),
  walkerId: integer("walker_id").references(() => users.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  hopType: text("hop_type").notNull(),
  status: text("status").notNull(),
  distanceMiles: text("distance_miles"),
  priceCents: integer("price_cents"),
  detourDistance: text("detour_distance"),
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

export type LoginRequest = z.infer<typeof insertUserSchema>;
export type RegisterRequest = z.infer<typeof insertUserSchema>;
export type CreateRouteRequest = Omit<InsertRoutineRoute, "driverId">;
export type UpdateRouteRequest = Partial<CreateRouteRequest>;

export type RequestMovementOptionRequest = {
  startLocation: string;
  endLocation: string;
  hopType: "walk" | "short_hop" | "flex_hop" | "full_ride";
  distanceMiles?: string;
};

export type UpdateFlexibilityRequest = {
  isFlexibleDriver: boolean;
  maxDetourDistance?: string;
  maxDetourTime?: number;
  detourAvailable?: boolean;
};
