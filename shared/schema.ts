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
  city: text("city"),
  isFounder: boolean("is_founder").default(false),
  founderBadge: text("founder_badge"),
  hasSeenWelcome: boolean("has_seen_welcome").default(false),
  hopStreak: integer("hop_streak").default(0),
  totalHops: integer("total_hops").default(0),
  lastHopDate: timestamp("last_hop_date"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  subscription: text("subscription"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  driverLicenseUrl: text("driver_license_url"),
  selfieUrl: text("selfie_url"),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleColor: text("vehicle_color"),
  licensePlate: text("license_plate"),
  driverVerified: boolean("driver_verified").default(false),
  isActive: boolean("is_active").default(false),
  agreedToTerms: boolean("agreed_to_terms").default(false),
  isAdmin: boolean("is_admin").default(false),
  isAmbassador: boolean("is_ambassador").default(false),
  isDisabled: boolean("is_disabled").default(false),
  phone: text("phone"),
  notificationsEnabled: boolean("notifications_enabled").default(false),
  paymentMethod: text("payment_method"),
  paymentHandle: text("payment_handle"),
  stripeAccountId: text("stripe_account_id"),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false),
  driverConvoComfort: text("driver_convo_comfort").default("friendly_chat"),
  driverMusicPref: text("driver_music_pref"),
  driverPetsOk: boolean("driver_pets_ok"),
  driverGroceriesOk: boolean("driver_groceries_ok"),
  driverLifestyleTags: text("driver_lifestyle_tags"),
  driverQuestionnaireCompleted: boolean("driver_questionnaire_completed").default(false),
  bio: text("bio"),
  interests: text("interests"),
  language: text("language").default("en"),
  signupNumber: integer("signup_number"),
  isRoutePioneer: boolean("is_route_pioneer").default(false),
  preferredRoutes: text("preferred_routes"),
  travelTime: text("travel_time"),
  favoritePlaces: text("favorite_places"),
  profilePhoto: text("profile_photo"),
  profileVisibility: text("profile_visibility").default("public"),
  lifetimeSubscription: boolean("lifetime_subscription").default(false),
  pricingPreference: text("pricing_preference").default("1.20"),
  allowFreeRides: boolean("allow_free_rides").default(false),
  allowFollowerFreeRides: boolean("allow_follower_free_rides").default(false),
  stripeSetupCompleted: boolean("stripe_setup_completed").default(false),
  hopperFlexRange: text("hopper_flex_range").default("0.25"),
  driverFlexRange: text("driver_flex_range").default("0.5"),
  hopperDropoffFlex: text("hopper_dropoff_flex").default("exact"),
  sharedCommute: boolean("shared_commute").default(false),
  modeLock: text("mode_lock").default("none"),
  allowDetourDrivers: boolean("allow_detour_drivers").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverApplications = pgTable("driver_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  notes: text("notes"),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  badge: text("badge").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const expansionWaitlist = pgTable("expansion_waitlist", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  city: text("city").notNull(),
  phone: text("phone").notNull(),
  notified: boolean("notified").default(false),
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
  tipCents: integer("tip_cents").default(0),
  detourDistance: text("detour_distance"),
  corridor: text("corridor"),
  startLat: text("start_lat"),
  startLng: text("start_lng"),
  endLat: text("end_lat"),
  endLng: text("end_lng"),
  rideStartedAt: timestamp("ride_started_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amountCents: integer("amount_cents").notNull(),
  message: text("message"),
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
  reactions: jsonb("reactions"),
  reply: text("reply"),
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

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  addresseeId: integer("addressee_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueFriendship: unique().on(table.requesterId, table.addresseeId),
}));

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walkerRoutes = pgTable("walker_routes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
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

export const insertExpansionWaitlistSchema = createInsertSchema(expansionWaitlist).omit({ id: true, createdAt: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, credits: true });
export const insertRoutineRouteSchema = createInsertSchema(routineRoutes).omit({ id: true, createdAt: true });
export const insertShortHopSchema = createInsertSchema(shortHops).omit({ id: true, createdAt: true });
export const insertRewardSchema = createInsertSchema(rewards).omit({ id: true, createdAt: true });
export const insertRedemptionSchema = createInsertSchema(userRedemptions).omit({ id: true, redeemedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertHopBuddyRatingSchema = createInsertSchema(hopBuddyRatings).omit({ id: true, createdAt: true });
export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export const insertFriendshipSchema = createInsertSchema(friendships).omit({ id: true, createdAt: true });
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

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;

export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;

export type ExpansionWaitlist = typeof expansionWaitlist.$inferSelect;
export type InsertExpansionWaitlist = z.infer<typeof insertExpansionWaitlistSchema>;

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

export const insertWalkerRouteSchema = createInsertSchema(walkerRoutes).omit({ id: true, createdAt: true });
export type WalkerRoute = typeof walkerRoutes.$inferSelect;
export type InsertWalkerRoute = z.infer<typeof insertWalkerRouteSchema>;

export const insertDriverApplicationSchema = createInsertSchema(driverApplications).omit({ id: true, submittedAt: true, reviewedAt: true });
export type DriverApplication = typeof driverApplications.$inferSelect;
export type InsertDriverApplication = z.infer<typeof insertDriverApplicationSchema>;

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("unread"),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reportedUserId: integer("reported_user_id").references(() => users.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true, status: true, adminReply: true, repliedAt: true });
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, status: true, adminNotes: true, resolvedAt: true });
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export const founderMessages = pgTable("founder_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isAdminReply: boolean("is_admin_reply").default(false),
  reactions: jsonb("reactions"),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFounderMessageSchema = createInsertSchema(founderMessages).omit({ id: true, createdAt: true });
export type FounderMessage = typeof founderMessages.$inferSelect;
export type InsertFounderMessage = z.infer<typeof insertFounderMessageSchema>;

export const vipMessages = pgTable("vip_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isAdminReply: boolean("is_admin_reply").default(false),
  reactions: jsonb("reactions"),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVipMessageSchema = createInsertSchema(vipMessages).omit({ id: true, createdAt: true });
export type VipMessage = typeof vipMessages.$inferSelect;
export type InsertVipMessage = z.infer<typeof insertVipMessageSchema>;

export const cashoutRequests = pgTable("cashout_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentHandle: text("payment_handle").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertCashoutSchema = createInsertSchema(cashoutRequests).omit({ id: true, createdAt: true, processedAt: true, status: true });
export type CashoutRequest = typeof cashoutRequests.$inferSelect;
export type InsertCashoutRequest = z.infer<typeof insertCashoutSchema>;

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  days: jsonb("days").notNull(),
  startLocation: text("start_location").notNull(),
  destination: text("destination").notNull(),
  timeStart: text("time_start"),
  timeEnd: text("time_end"),
  returnTrip: boolean("return_trip").default(false),
  active: boolean("active").default(true),
  corridor: text("corridor"),
  anytime: boolean("anytime").default(false),
  paymentPreference: text("payment_preference").default("card"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export const ambassadorRequests = pgTable("ambassador_requests", {
  id: serial("id").primaryKey(),
  ambassadorId: integer("ambassador_id").references(() => users.id).notNull(),
  targetUserId: integer("target_user_id").references(() => users.id).notNull(),
  actionType: text("action_type").notNull(), // "suspend_hopper", "suspend_driver", "delete_hopper", "delete_driver"
  evidence: text("evidence").notNull(),
  status: text("status").default("pending").notNull(), // "pending", "approved", "rejected"
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertAmbassadorRequestSchema = createInsertSchema(ambassadorRequests).omit({ id: true, createdAt: true, reviewedAt: true, status: true, adminNotes: true });
export type AmbassadorRequest = typeof ambassadorRequests.$inferSelect;
export type InsertAmbassadorRequest = z.infer<typeof insertAmbassadorRequestSchema>;

export const freeRideList = pgTable("free_ride_list", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  riderId: integer("rider_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePair: unique().on(table.driverId, table.riderId),
}));

export const insertFreeRideListSchema = createInsertSchema(freeRideList).omit({ id: true, createdAt: true });
export type FreeRideEntry = typeof freeRideList.$inferSelect;
export type InsertFreeRideEntry = z.infer<typeof insertFreeRideListSchema>;

export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  policyType: text("policy_type").notNull(), // "privacy" or "safety"
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPoliciesSchema = createInsertSchema(policies).omit({ id: true, updatedAt: true });
export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPoliciesSchema>;

export type LoginRequest = z.infer<typeof insertUserSchema>;
export type RegisterRequest = z.infer<typeof insertUserSchema>;
