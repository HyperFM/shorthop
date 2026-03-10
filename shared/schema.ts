import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
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
  tier: text("tier").default("standard"),
  rideVibe: text("ride_vibe").default("friendly_chat"),
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

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  wheelsCost: integer("wheels_cost").notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRedemptions = pgTable("user_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  rewardId: integer("reward_id").references(() => rewards.id).notNull(),
  code: text("code").notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hopBuddyRatings = pgTable("hop_buddy_ratings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => shortHops.id).notNull(),
  raterId: integer("rater_id").references(() => users.id).notNull(),
  ratedUserId: integer("rated_user_id").references(() => users.id).notNull(),
  rating: text("rating").notNull(),
  wantRideAgain: boolean("want_ride_again").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id).notNull(),
  followingId: integer("following_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueFollow: unique().on(table.followerId, table.followingId),
}));

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  routineRoutes: many(routineRoutes),
  hopsAsWalker: many(shortHops, { relationName: "walker" }),
  hopsAsDriver: many(shortHops, { relationName: "driver" }),
  redemptions: many(userRedemptions),
  posts: many(communityPosts),
  ratingsGiven: many(hopBuddyRatings, { relationName: "rater" }),
  ratingsReceived: many(hopBuddyRatings, { relationName: "rated" }),
}));

export const rewardRelations = relations(rewards, ({ many }) => ({
  redemptions: many(userRedemptions),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, credits: true });
export const insertRoutineRouteSchema = createInsertSchema(routineRoutes).omit({ id: true, createdAt: true });
export const insertShortHopSchema = createInsertSchema(shortHops).omit({ id: true, createdAt: true });
export const insertRewardSchema = createInsertSchema(rewards).omit({ id: true, createdAt: true });
export const insertRedemptionSchema = createInsertSchema(userRedemptions).omit({ id: true, redeemedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertHopBuddyRatingSchema = createInsertSchema(hopBuddyRatings).omit({ id: true, createdAt: true });
export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RoutineRoute = typeof routineRoutes.$inferSelect;
export type InsertRoutineRoute = z.infer<typeof insertRoutineRouteSchema>;

export type ShortHop = typeof shortHops.$inferSelect;
export type InsertShortHop = z.infer<typeof insertShortHopSchema>;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;

export type UserRedemption = typeof userRedemptions.$inferSelect;
export type InsertUserRedemption = z.infer<typeof insertRedemptionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type HopBuddyRating = typeof hopBuddyRatings.$inferSelect;
export type InsertHopBuddyRating = z.infer<typeof insertHopBuddyRatingSchema>;

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;

export type LoginRequest = z.infer<typeof insertUserSchema>;
export type RegisterRequest = z.infer<typeof insertUserSchema>;
