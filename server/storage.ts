import { db } from "./db";
import { eq, and, or, desc, sql, count } from "drizzle-orm";
import {
  users,
  routineRoutes,
  shortHops,
  rewards,
  userRedemptions,
  notifications,
  hopBuddyRatings,
  follows,
  friendships,
  communityPosts,
  expansionWaitlist,
  userBadges,
  driverApplications,
  type User,
  type InsertUser,
  type RoutineRoute,
  type InsertRoutineRoute,
  type ShortHop,
  type InsertShortHop,
  type Reward,
  type UserRedemption,
  type Notification,
  type InsertNotification,
  type HopBuddyRating,
  type InsertHopBuddyRating,
  type Follow,
  type Friendship,
  type CommunityPost,
  type InsertCommunityPost,
  type InsertExpansionWaitlist,
  type ExpansionWaitlist,
  type UserBadge,
  type DriverApplication,
  walkerRoutes,
  type WalkerRoute,
  type InsertWalkerRoute,
  contactMessages,
  type ContactMessage,
  type InsertContactMessage,
  reports,
  type Report,
  type InsertReport,
  founderMessages,
  type FounderMessage,
  type InsertFounderMessage,
  vipMessages,
  type VipMessage,
  type InsertVipMessage,
  cashoutRequests,
  type CashoutRequest,
  type InsertCashoutRequest,
  donations,
  schedules,
  type Schedule,
  type InsertSchedule,
  ambassadorRequests,
  type AmbassadorRequest,
  type InsertAmbassadorRequest,
  policies,
  type Policy,
  type InsertPolicy,
  freeRideList,
  type FreeRideEntry,
  savedRoutes,
  type SavedRoute,
  type InsertSavedRoute,
  commuteCircles,
  commuteCircleMembers,
  starHoppers,
  tripLogs,
  refundRequests,
  userActivityWindows,
  type CommuteCircle,
  type InsertCommuteCircle,
  type CommuteCircleMember,
  type StarHopper,
  type TripLog,
  type RefundRequest,
  type UserActivityWindow,
  rideMessages,
  type RideMessage,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserFlexibility(id: number, updates: any): Promise<User>;
  updateUserPreferences(id: number, updates: { rideVibe?: string; tier?: string; hopperFlexRange?: string; driverFlexRange?: string; isFlexibleDriver?: boolean; hopperDropoffFlex?: string; sharedCommute?: boolean; modeLock?: string; allowDetourDrivers?: boolean; magicGpsEnabled?: boolean; flowModeEnabled?: boolean; seatsNeeded?: number; availableSeats?: number; littleEarly?: boolean; homeAddress?: string; homeLat?: string; homeLng?: string; workAddress?: string; workLat?: string; workLng?: string; customLocationName?: string; customLocationAddress?: string; customLocationLat?: string; customLocationLng?: string }): Promise<User>;
  dismissWelcome(id: number): Promise<void>;
  getNetworkStats(): Promise<{ totalUsers: number; totalDrivers: number; totalHoppers: number; activeDrivers: number; nextMilestone: number; foundingHoppersRemaining: number; foundingDriversRemaining: number }>;
  checkAndAssignFounderStatus(userId: number, isDriver: boolean): Promise<User>;
  toggleDriverMode(userId: number, enable: boolean): Promise<User>;

  addToExpansionWaitlist(entry: InsertExpansionWaitlist): Promise<ExpansionWaitlist>;

  updateHopStreak(userId: number): Promise<{ streak: number; totalHops: number; newBadges: string[] }>;
  getUserBadges(userId: number): Promise<UserBadge[]>;
  awardBadge(userId: number, badge: string): Promise<UserBadge>;
  getLeaderboard(): Promise<{ mostHops: { username: string; totalHops: number; isDriver: boolean | null }[]; topDrivers: { username: string; credits: number }[]; communityHoppers: { username: string; postCount: number }[] }>;
  processReferral(newUserId: number, referralCode: string): Promise<boolean>;
  getNotificationCountToday(userId: number): Promise<number>;

  getRoutes(driverId: number): Promise<RoutineRoute[]>;
  createRoute(route: InsertRoutineRoute): Promise<RoutineRoute>;
  deleteRoute(id: number): Promise<void>;

  getHopsForWalker(walkerId: number): Promise<ShortHop[]>;
  getHopsForDriver(driverId: number): Promise<ShortHop[]>;
  getAvailableHops(): Promise<ShortHop[]>;
  createHop(hop: InsertShortHop): Promise<ShortHop>;
  acceptHop(hopId: number, driverId: number): Promise<ShortHop>;
  completeHop(hopId: number, distanceMiles: string): Promise<ShortHop>;
  cancelHop(hopId: number, walkerId: number): Promise<ShortHop>;

  getWalkerRoutes(userId: number): Promise<WalkerRoute[]>;
  createWalkerRoute(route: InsertWalkerRoute): Promise<WalkerRoute>;
  deleteWalkerRoute(id: number, userId: number): Promise<void>;

  getSavedRoutes(userId: number): Promise<SavedRoute[]>;
  createSavedRoute(route: InsertSavedRoute): Promise<SavedRoute>;
  updateSavedRoute(id: number, userId: number, updates: { name?: string; address?: string; lat?: string; lng?: string }): Promise<SavedRoute>;
  deleteSavedRoute(id: number, userId: number): Promise<void>;
  incrementSavedRouteConfirm(id: number, userId: number): Promise<void>;

  getCommuteCircles(): Promise<CommuteCircle[]>;
  getCommuteCircle(id: number): Promise<CommuteCircle | undefined>;
  createCommuteCircle(circle: InsertCommuteCircle): Promise<CommuteCircle>;
  deleteCommuteCircle(id: number, userId: number): Promise<void>;
  getCircleMembers(circleId: number): Promise<CommuteCircleMember[]>;
  joinCircle(circleId: number, userId: number): Promise<CommuteCircleMember>;
  leaveCircle(circleId: number, userId: number): Promise<void>;
  getUserCircles(userId: number): Promise<CommuteCircle[]>;
  getCircleMemberUserIds(circleId: number): Promise<number[]>;
  getSharedCircleUserIds(userId: number): Promise<number[]>;

  createTripLog(hopId: number, driverId: number, hopperId: number): Promise<TripLog>;
  getTripLog(hopId: number): Promise<TripLog | undefined>;
  appendGpsPoint(hopId: number, userId: number, lat: number, lng: number): Promise<void>;
  setGreenlight1(hopId: number): Promise<void>;
  setGreenlight2(hopId: number): Promise<void>;
  setGpsIncomplete(hopId: number): Promise<void>;
  logGpsEvent(hopId: number, event: string): Promise<void>;

  createRefundRequest(hopId: number, userId: number, reason: string, aiResponse: string, gl1: boolean, gl2: boolean, gpsOk: boolean): Promise<RefundRequest>;
  getRefundRequest(hopId: number): Promise<RefundRequest | undefined>;
  getRefundRequests(): Promise<RefundRequest[]>;
  resolveRefundRequest(id: number, status: string, adminNotes: string): Promise<RefundRequest>;

  getStarHoppers(userId: number): Promise<StarHopper[]>;
  addStarHopper(userId: number, starUserId: number): Promise<StarHopper>;

  getRideMessages(hopId: number): Promise<RideMessage[]>;
  createRideMessage(hopId: number, senderId: number, message: string): Promise<RideMessage>;
  removeStarHopper(userId: number, starUserId: number): Promise<void>;
  getStarHopperUserIds(userId: number): Promise<number[]>;
  isStarHopper(userId: number, otherUserId: number): Promise<boolean>;

  getUserActivityWindows(userId: number): Promise<UserActivityWindow[]>;
  upsertActivityWindow(userId: number, dayOfWeek: number, startHour: number, endHour: number): Promise<UserActivityWindow>;

  getRewards(): Promise<Reward[]>;
  redeemReward(userId: number, rewardId: number): Promise<{ code: string; reward: Reward }>;
  deductCredits(userId: number, amount: number): Promise<void>;
  addCredits(userId: number, amount: number): Promise<void>;
  setAdmin(userId: number, isAdmin: boolean): Promise<void>;
  getUserRedemptions(userId: number): Promise<UserRedemption[]>;
  getAllRedemptions(): Promise<(UserRedemption & { username: string; rewardName: string })[]>;
  createCashout(cashout: InsertCashoutRequest): Promise<CashoutRequest>;
  createCashoutAtomic(userId: number, amount: number, paymentMethod: string, paymentHandle: string): Promise<CashoutRequest>;
  getUserCashouts(userId: number): Promise<CashoutRequest[]>;
  getAllCashouts(): Promise<(CashoutRequest & { username: string })[]>;
  processCashout(id: number): Promise<CashoutRequest>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number, userId: number): Promise<Notification>;
  markAllNotificationsRead(userId: number): Promise<void>;

  createRating(rating: InsertHopBuddyRating): Promise<HopBuddyRating>;

  followUser(followerId: number, followingId: number): Promise<Follow>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  getFollows(userId: number): Promise<{ id: number; userId: number; username: string; isMutual: boolean }[]>;

  sendFriendRequest(requesterId: number, addresseeId: number): Promise<any>;
  respondFriendRequest(friendshipId: number, userId: number, accept: boolean): Promise<any>;
  getFriendRequests(userId: number): Promise<{ id: number; requesterId: number; username: string; profilePhoto: string | null; createdAt: Date | null }[]>;
  getFriends(userId: number): Promise<{ id: number; friendId: number; username: string; profilePhoto: string | null }[]>;
  getFriendCount(userId: number): Promise<number>;
  getFriendshipStatus(userId: number, otherUserId: number): Promise<string | null>;
  areFriends(userId: number, otherUserId: number): Promise<boolean>;
  getDMConversations(userId: number): Promise<any[]>;
  getDMMessages(userId: number, otherUserId: number): Promise<any[]>;
  markDMsRead(userId: number, senderId: number): Promise<void>;
  sendDM(senderId: number, receiverId: number, message: string): Promise<any>;
  getUnreadDMCount(userId: number): Promise<number>;
  getPublicProfiles(currentUserId: number): Promise<{ id: number; username: string; profilePhoto: string | null; bio: string | null; interests: string | null; profileVisibility: string | null; isFounder: boolean | null; founderBadge: string | null; subscription: string | null; totalHops: number | null; friendCount: number; idVerified: boolean | null }[]>;

  getCommunityPosts(): Promise<{ id: number; userId: number; content: string; createdAt: Date | null; username: string }[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;

  submitDriverApplication(userId: number): Promise<DriverApplication>;
  getDriverApplication(userId: number): Promise<DriverApplication | undefined>;
  getDriverApplications(): Promise<(DriverApplication & { username: string })[]>;
  reviewDriverApplication(appId: number, status: string, reviewerId: number, notes?: string): Promise<DriverApplication>;
  setDriverActive(userId: number, active: boolean): Promise<User>;
  getActiveDrivers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  disableUser(id: number, disabled: boolean): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getHop(id: number): Promise<ShortHop | undefined>;
  tipDriver(hopId: number, tipCents: number): Promise<void>;
  createDonation(userId: number, amountCents: number, message: string | null): Promise<void>;
  getSystemLogs(limit?: number): Promise<ShortHop[]>;

  createContactMessage(msg: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<(ContactMessage & { username: string })[]>;
  replyToContactMessage(id: number, reply: string): Promise<ContactMessage>;

  createReport(report: InsertReport): Promise<Report>;
  getReports(): Promise<(Report & { username: string; reportedUsername?: string })[]>;
  resolveReport(id: number, notes: string): Promise<Report>;

  getFounderMessages(): Promise<(FounderMessage & { username: string })[]>;
  createFounderMessage(msg: InsertFounderMessage): Promise<FounderMessage>;
  getVipMessages(userId: number): Promise<(VipMessage & { username: string })[]>;
  createVipMessage(msg: InsertVipMessage): Promise<VipMessage>;
  getVipConversations(): Promise<{ userId: number; username: string; lastMessage: string; lastAt: string; unread: number }[]>;
  getWidgetData(userId: number): Promise<{
    role: "driver" | "hopper";
    directionLabel: string;
    directionCount: number;
    nearbyActive: number;
    driversInArea: number;
    isActive: boolean;
  }>;

  getUserSchedules(userId: number): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, userId: number, updates: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: number, userId: number): Promise<void>;

  getAmbassadors(): Promise<User[]>;
  setAmbassador(userId: number, isAmbassador: boolean): Promise<User>;
  getAmbassadorRequests(): Promise<(AmbassadorRequest & { ambassadorUsername: string; targetUsername: string })[]>;
  createAmbassadorRequest(request: InsertAmbassadorRequest): Promise<AmbassadorRequest>;
  reviewAmbassadorRequest(id: number, status: string, adminNotes?: string): Promise<AmbassadorRequest>;

  getPolicy(policyType: string): Promise<Policy | undefined>;
  updatePolicy(policyType: string, content: string): Promise<Policy>;
  getAllPolicies(): Promise<Policy[]>;

  getFreeRideList(driverId: number): Promise<{ id: number; riderId: number; username: string; createdAt: Date | null }[]>;
  addFreeRideUser(driverId: number, riderId: number): Promise<any>;
  removeFreeRideUser(driverId: number, riderId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserFlexibility(id: number, updates: any): Promise<User> {
    const safeKeys = ['isFlexibleDriver', 'maxDetourDistance', 'maxDetourTime', 'detourAvailable'];
    const safeUpdates: Record<string, any> = {};
    for (const key of safeKeys) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }
    if (Object.keys(safeUpdates).length === 0) throw new Error("No valid fields");
    const [user] = await db.update(users)
      .set(safeUpdates)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserPreferences(id: number, updates: { rideVibe?: string; tier?: string; hopperFlexRange?: string; driverFlexRange?: string; isFlexibleDriver?: boolean; hopperDropoffFlex?: string; sharedCommute?: boolean; modeLock?: string; allowDetourDrivers?: boolean; magicGpsEnabled?: boolean; flowModeEnabled?: boolean; seatsNeeded?: number; availableSeats?: number; littleEarly?: boolean; homeAddress?: string; homeLat?: string; homeLng?: string; workAddress?: string; workLat?: string; workLng?: string; customLocationName?: string; customLocationAddress?: string; customLocationLat?: string; customLocationLng?: string }): Promise<User> {
    const setValues: any = {};
    if (updates.rideVibe) setValues.rideVibe = updates.rideVibe;
    if (updates.tier) setValues.tier = updates.tier;
    if (updates.hopperFlexRange !== undefined) setValues.hopperFlexRange = updates.hopperFlexRange;
    if (updates.driverFlexRange !== undefined) setValues.driverFlexRange = updates.driverFlexRange;
    if (updates.isFlexibleDriver !== undefined) setValues.isFlexibleDriver = updates.isFlexibleDriver;
    if (updates.hopperDropoffFlex !== undefined) setValues.hopperDropoffFlex = updates.hopperDropoffFlex;
    if (updates.sharedCommute !== undefined) setValues.sharedCommute = updates.sharedCommute;
    if (updates.modeLock !== undefined) setValues.modeLock = updates.modeLock;
    if (updates.allowDetourDrivers !== undefined) setValues.allowDetourDrivers = updates.allowDetourDrivers;
    if (updates.magicGpsEnabled !== undefined) setValues.magicGpsEnabled = updates.magicGpsEnabled;
    if (updates.flowModeEnabled !== undefined) setValues.flowModeEnabled = updates.flowModeEnabled;
    if (updates.seatsNeeded !== undefined) setValues.seatsNeeded = updates.seatsNeeded;
    if (updates.availableSeats !== undefined) setValues.availableSeats = updates.availableSeats;
    if (updates.littleEarly !== undefined) setValues.littleEarly = updates.littleEarly;
    if (updates.homeAddress !== undefined) setValues.homeAddress = updates.homeAddress;
    if (updates.homeLat !== undefined) setValues.homeLat = updates.homeLat;
    if (updates.homeLng !== undefined) setValues.homeLng = updates.homeLng;
    if (updates.workAddress !== undefined) setValues.workAddress = updates.workAddress;
    if (updates.workLat !== undefined) setValues.workLat = updates.workLat;
    if (updates.workLng !== undefined) setValues.workLng = updates.workLng;
    if (updates.customLocationName !== undefined) setValues.customLocationName = updates.customLocationName;
    if (updates.customLocationAddress !== undefined) setValues.customLocationAddress = updates.customLocationAddress;
    if (updates.customLocationLat !== undefined) setValues.customLocationLat = updates.customLocationLat;
    if (updates.customLocationLng !== undefined) setValues.customLocationLng = updates.customLocationLng;
    const [user] = await db.update(users)
      .set(setValues)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async dismissWelcome(id: number): Promise<void> {
    await db.update(users).set({ hasSeenWelcome: true }).where(eq(users.id, id));
  }

  async getNetworkStats(): Promise<{ totalUsers: number; totalDrivers: number; totalHoppers: number; activeDrivers: number; nextMilestone: number; foundingHoppersRemaining: number; foundingDriversRemaining: number }> {
    const TEST_ACCOUNTS = ["walker", "driver"];
    const allUsers = (await db.select().from(users)).filter(u => !TEST_ACCOUNTS.includes(u.username));
    const totalUsers = allUsers.length;
    const totalDrivers = allUsers.filter(u => u.isDriver).length;
    const totalHoppers = allUsers.filter(u => !u.isDriver).length;
    const activeDriversResult = await this.getActiveDrivers();

    const milestones = [10, 25, 50, 100, 250, 500, 1000, 2000, 3000, 5000];
    const nextMilestone = milestones.find(m => m > totalUsers) || 5000;

    const totalFounders = allUsers.filter(u => u.isFounder).length;
    const foundingSpotsRemaining = Math.max(0, 50 - totalFounders);

    return {
      totalUsers,
      totalDrivers,
      totalHoppers,
      activeDrivers: activeDriversResult.length,
      nextMilestone,
      foundingHoppersRemaining: foundingSpotsRemaining,
      foundingDriversRemaining: foundingSpotsRemaining,
    };
  }

  async checkAndAssignFounderStatus(userId: number, isDriver: boolean): Promise<User> {
    const allUsers = await db.select().from(users);
    const totalFounders = allUsers.filter(u => u.isFounder).length;

    if (totalFounders < 50) {
      const badge = isDriver ? "Founding Driver" : "Founding Hopper";
      const tier = "flexhop";
      const [updated] = await db.update(users)
        .set({ isFounder: true, founderBadge: badge, tier })
        .where(eq(users.id, userId))
        .returning();
      return updated;
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async toggleDriverMode(userId: number, enable: boolean): Promise<User> {
    const [updated] = await db.update(users)
      .set({ isDriver: enable })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getRoutes(driverId: number): Promise<RoutineRoute[]> {
    return await db.select().from(routineRoutes).where(eq(routineRoutes.driverId, driverId));
  }

  async createRoute(route: InsertRoutineRoute): Promise<RoutineRoute> {
    const [newRoute] = await db.insert(routineRoutes).values(route).returning();
    return newRoute;
  }

  async deleteRoute(id: number): Promise<void> {
    await db.delete(routineRoutes).where(eq(routineRoutes.id, id));
  }

  async getHopsForWalker(walkerId: number): Promise<ShortHop[]> {
    return await db.select().from(shortHops).where(eq(shortHops.walkerId, walkerId));
  }

  async getHopsForDriver(driverId: number): Promise<ShortHop[]> {
    return await db.select().from(shortHops).where(eq(shortHops.driverId, driverId));
  }

  async getAvailableHops(): Promise<ShortHop[]> {
    return await db.select().from(shortHops).where(eq(shortHops.status, "requested"));
  }

  async createHop(hop: InsertShortHop): Promise<ShortHop> {
    const [newHop] = await db.insert(shortHops).values(hop).returning();
    return newHop;
  }

  async acceptHop(hopId: number, driverId: number): Promise<ShortHop> {
    const [updatedHop] = await db.update(shortHops)
      .set({ driverId, status: "matched" })
      .where(eq(shortHops.id, hopId))
      .returning();
    if (!updatedHop) throw new Error("Hop not found");
    return updatedHop;
  }

  async completeHop(hopId: number, distanceMiles: string): Promise<ShortHop> {
    const [updatedHop] = await db.update(shortHops)
      .set({ status: "completed", distanceMiles: distanceMiles as any })
      .where(eq(shortHops.id, hopId))
      .returning();
      
    if (!updatedHop) throw new Error("Hop not found");
    
    const dist = parseFloat(distanceMiles);
    if (updatedHop.driverId) {
       const driver = await this.getUser(updatedHop.driverId);
       if (driver) {
          const driverEarnings = Math.max(1, Math.floor(dist));
          await db.update(users)
            .set({ credits: (driver.credits || 0) + driverEarnings })
            .where(eq(users.id, driver.id));
       }
    }

    return updatedHop;
  }

  async cancelHop(hopId: number, walkerId: number): Promise<ShortHop> {
    const [hop] = await db.select().from(shortHops).where(eq(shortHops.id, hopId));
    if (!hop || hop.walkerId !== walkerId) throw new Error("Hop not found");
    if (hop.status === 'completed' || hop.status === 'cancelled') throw new Error("Cannot cancel this hop");
    const [updated] = await db.update(shortHops)
      .set({ status: "cancelled" })
      .where(eq(shortHops.id, hopId))
      .returning();
    return updated;
  }

  async getWalkerRoutes(userId: number): Promise<WalkerRoute[]> {
    return await db.select().from(walkerRoutes).where(eq(walkerRoutes.userId, userId)).orderBy(desc(walkerRoutes.createdAt));
  }

  async createWalkerRoute(route: InsertWalkerRoute): Promise<WalkerRoute> {
    const [newRoute] = await db.insert(walkerRoutes).values(route).returning();
    return newRoute;
  }

  async deleteWalkerRoute(id: number, userId: number): Promise<void> {
    await db.delete(walkerRoutes).where(and(eq(walkerRoutes.id, id), eq(walkerRoutes.userId, userId)));
  }

  async getSavedRoutes(userId: number): Promise<SavedRoute[]> {
    return await db.select().from(savedRoutes).where(eq(savedRoutes.userId, userId)).orderBy(desc(savedRoutes.confirmCount));
  }

  async createSavedRoute(route: InsertSavedRoute): Promise<SavedRoute> {
    const [created] = await db.insert(savedRoutes).values(route).returning();
    return created;
  }

  async updateSavedRoute(id: number, userId: number, updates: { name?: string; address?: string; lat?: string; lng?: string }): Promise<SavedRoute> {
    const setValues: any = {};
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.address !== undefined) setValues.address = updates.address;
    if (updates.lat !== undefined) setValues.lat = updates.lat;
    if (updates.lng !== undefined) setValues.lng = updates.lng;
    const [updated] = await db.update(savedRoutes).set(setValues).where(and(eq(savedRoutes.id, id), eq(savedRoutes.userId, userId))).returning();
    if (!updated) throw new Error("Saved route not found");
    return updated;
  }

  async deleteSavedRoute(id: number, userId: number): Promise<void> {
    await db.delete(savedRoutes).where(and(eq(savedRoutes.id, id), eq(savedRoutes.userId, userId)));
  }

  async incrementSavedRouteConfirm(id: number, userId: number): Promise<void> {
    await db.update(savedRoutes).set({ confirmCount: sql`${savedRoutes.confirmCount} + 1` }).where(and(eq(savedRoutes.id, id), eq(savedRoutes.userId, userId)));
  }

  async getCommuteCircles(): Promise<CommuteCircle[]> {
    return await db.select().from(commuteCircles).orderBy(desc(commuteCircles.createdAt));
  }

  async getCommuteCircle(id: number): Promise<CommuteCircle | undefined> {
    const [circle] = await db.select().from(commuteCircles).where(eq(commuteCircles.id, id));
    return circle;
  }

  async createCommuteCircle(circle: InsertCommuteCircle): Promise<CommuteCircle> {
    const [created] = await db.insert(commuteCircles).values(circle).returning();
    await db.insert(commuteCircleMembers).values({ circleId: created.id, userId: circle.creatorId });
    return created;
  }

  async deleteCommuteCircle(id: number, userId: number): Promise<void> {
    const [circle] = await db.select().from(commuteCircles).where(and(eq(commuteCircles.id, id), eq(commuteCircles.creatorId, userId)));
    if (!circle) throw new Error("Not authorized to delete this circle");
    await db.delete(commuteCircleMembers).where(eq(commuteCircleMembers.circleId, id));
    await db.delete(commuteCircles).where(eq(commuteCircles.id, id));
  }

  async getCircleMembers(circleId: number): Promise<CommuteCircleMember[]> {
    return await db.select().from(commuteCircleMembers).where(eq(commuteCircleMembers.circleId, circleId));
  }

  async joinCircle(circleId: number, userId: number): Promise<CommuteCircleMember> {
    const existing = await db.select().from(commuteCircleMembers).where(and(eq(commuteCircleMembers.circleId, circleId), eq(commuteCircleMembers.userId, userId)));
    if (existing.length > 0) return existing[0];
    const [member] = await db.insert(commuteCircleMembers).values({ circleId, userId }).returning();
    return member;
  }

  async leaveCircle(circleId: number, userId: number): Promise<void> {
    await db.delete(commuteCircleMembers).where(and(eq(commuteCircleMembers.circleId, circleId), eq(commuteCircleMembers.userId, userId)));
  }

  async getUserCircles(userId: number): Promise<CommuteCircle[]> {
    const memberships = await db.select().from(commuteCircleMembers).where(eq(commuteCircleMembers.userId, userId));
    if (memberships.length === 0) return [];
    const circleIds = memberships.map(m => m.circleId);
    const circles = await db.select().from(commuteCircles).where(sql`${commuteCircles.id} IN (${sql.join(circleIds.map(id => sql`${id}`), sql`, `)})`);
    return circles;
  }

  async getCircleMemberUserIds(circleId: number): Promise<number[]> {
    const members = await db.select().from(commuteCircleMembers).where(eq(commuteCircleMembers.circleId, circleId));
    return members.map(m => m.userId);
  }

  async getSharedCircleUserIds(userId: number): Promise<number[]> {
    const userCircles = await db.select({ circleId: commuteCircleMembers.circleId })
      .from(commuteCircleMembers).where(eq(commuteCircleMembers.userId, userId));
    if (userCircles.length === 0) return [];
    const circleIds = userCircles.map(c => c.circleId);
    const peerMembers = await db.select({ userId: commuteCircleMembers.userId })
      .from(commuteCircleMembers).where(
        and(
          sql`${commuteCircleMembers.circleId} IN (${sql.join(circleIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${commuteCircleMembers.userId} != ${userId}`
        )
      );
    return [...new Set(peerMembers.map(m => m.userId))];
  }

  async createTripLog(hopId: number, driverId: number, hopperId: number): Promise<TripLog> {
    const [log] = await db.insert(tripLogs).values({ hopId, driverId, hopperId }).returning();
    return log;
  }

  async getTripLog(hopId: number): Promise<TripLog | undefined> {
    const [log] = await db.select().from(tripLogs).where(eq(tripLogs.hopId, hopId));
    return log;
  }

  async appendGpsPoint(hopId: number, userId: number, lat: number, lng: number): Promise<void> {
    const log = await this.getTripLog(hopId);
    if (!log) return;
    const point = { lat, lng, t: Date.now() };
    if (userId === log.driverId) {
      const path = Array.isArray(log.driverGpsPath) ? [...(log.driverGpsPath as any[]), point] : [point];
      await db.update(tripLogs).set({ driverGpsPath: path }).where(eq(tripLogs.hopId, hopId));
    } else {
      const path = Array.isArray(log.hopperGpsPath) ? [...(log.hopperGpsPath as any[]), point] : [point];
      await db.update(tripLogs).set({ hopperGpsPath: path }).where(eq(tripLogs.hopId, hopId));
    }
  }

  async setGreenlight1(hopId: number): Promise<void> {
    const now = new Date();
    await db.update(tripLogs).set({ greenlight1: true, greenlight1At: now }).where(eq(tripLogs.hopId, hopId));
    await db.update(shortHops).set({ greenlight1: true, greenlight1At: now }).where(eq(shortHops.id, hopId));
  }

  async setGreenlight2(hopId: number): Promise<void> {
    const now = new Date();
    await db.update(tripLogs).set({ greenlight2: true, greenlight2At: now }).where(eq(tripLogs.hopId, hopId));
    await db.update(shortHops).set({ greenlight2: true, greenlight2At: now }).where(eq(shortHops.id, hopId));
  }

  async setGpsIncomplete(hopId: number): Promise<void> {
    await db.update(tripLogs).set({ gpsComplete: false }).where(eq(tripLogs.hopId, hopId));
    await db.update(shortHops).set({ gpsComplete: false }).where(eq(shortHops.id, hopId));
  }

  async logGpsEvent(hopId: number, event: string): Promise<void> {
    const log = await this.getTripLog(hopId);
    if (!log) return;
    const events = Array.isArray(log.gpsEvents) ? [...(log.gpsEvents as any[]), { event, t: Date.now() }] : [{ event, t: Date.now() }];
    await db.update(tripLogs).set({ gpsEvents: events }).where(eq(tripLogs.hopId, hopId));
  }

  async createRefundRequest(hopId: number, userId: number, reason: string, aiResponse: string, gl1: boolean, gl2: boolean, gpsOk: boolean): Promise<RefundRequest> {
    const [req] = await db.insert(refundRequests).values({
      hopId, userId, reason, aiResponse, status: "pending",
      greenlight1Status: gl1, greenlight2Status: gl2, gpsCompleteStatus: gpsOk,
    }).returning();
    return req;
  }

  async getRefundRequest(hopId: number): Promise<RefundRequest | undefined> {
    const [req] = await db.select().from(refundRequests).where(eq(refundRequests.hopId, hopId));
    return req;
  }

  async getRefundRequests(): Promise<RefundRequest[]> {
    return await db.select().from(refundRequests).orderBy(desc(refundRequests.createdAt));
  }

  async resolveRefundRequest(id: number, status: string, adminNotes: string): Promise<RefundRequest> {
    const [updated] = await db.update(refundRequests).set({ status, adminNotes, resolvedAt: new Date() }).where(eq(refundRequests.id, id)).returning();
    return updated;
  }

  async getStarHoppers(userId: number): Promise<StarHopper[]> {
    return await db.select().from(starHoppers).where(eq(starHoppers.userId, userId)).orderBy(desc(starHoppers.createdAt));
  }

  async addStarHopper(userId: number, starUserId: number): Promise<StarHopper> {
    const existing = await db.select().from(starHoppers).where(and(eq(starHoppers.userId, userId), eq(starHoppers.starUserId, starUserId)));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(starHoppers).values({ userId, starUserId }).returning();
    return created;
  }

  async removeStarHopper(userId: number, starUserId: number): Promise<void> {
    await db.delete(starHoppers).where(and(eq(starHoppers.userId, userId), eq(starHoppers.starUserId, starUserId)));
  }

  async getStarHopperUserIds(userId: number): Promise<number[]> {
    const stars = await db.select({ starUserId: starHoppers.starUserId }).from(starHoppers).where(eq(starHoppers.userId, userId));
    return stars.map(s => s.starUserId);
  }

  async isStarHopper(userId: number, otherUserId: number): Promise<boolean> {
    const [result] = await db.select().from(starHoppers).where(and(eq(starHoppers.userId, userId), eq(starHoppers.starUserId, otherUserId)));
    return !!result;
  }

  async getRideMessages(hopId: number): Promise<RideMessage[]> {
    return await db.select().from(rideMessages).where(eq(rideMessages.hopId, hopId)).orderBy(rideMessages.createdAt);
  }

  async createRideMessage(hopId: number, senderId: number, message: string): Promise<RideMessage> {
    const [msg] = await db.insert(rideMessages).values({ hopId, senderId, message }).returning();
    return msg;
  }

  async getUserActivityWindows(userId: number): Promise<UserActivityWindow[]> {
    return await db.select().from(userActivityWindows).where(eq(userActivityWindows.userId, userId));
  }

  async upsertActivityWindow(userId: number, dayOfWeek: number, startHour: number, endHour: number): Promise<UserActivityWindow> {
    const existing = await db.select().from(userActivityWindows).where(
      and(eq(userActivityWindows.userId, userId), eq(userActivityWindows.dayOfWeek, dayOfWeek), eq(userActivityWindows.startHour, startHour), eq(userActivityWindows.endHour, endHour))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(userActivityWindows).set({ count: sql`${userActivityWindows.count} + 1` }).where(eq(userActivityWindows.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(userActivityWindows).values({ userId, dayOfWeek, startHour, endHour }).returning();
    return created;
  }

  async getRewards(): Promise<Reward[]> {
    return await db.select().from(rewards).where(eq(rewards.isAvailable, true));
  }

  async redeemReward(userId: number, rewardId: number): Promise<{ code: string; reward: Reward }> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId));
    if (!reward) throw new Error("Reward not found");

    const deductResult = await db.execute(sql`
      UPDATE users SET credits = credits - ${reward.wheelsCost}
      WHERE id = ${userId} AND credits >= ${reward.wheelsCost}
      RETURNING credits
    `);
    if (!deductResult.rows || deductResult.rows.length === 0) {
      throw new Error("Insufficient wheels");
    }

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await db.insert(userRedemptions).values({
      userId,
      rewardId,
      code,
    });

    return { code, reward };
  }

  async setAdmin(userId: number, isAdmin: boolean): Promise<void> {
    await db.update(users).set({ isAdmin }).where(eq(users.id, userId));
  }

  async addCredits(userId: number, amount: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    await db.update(users)
      .set({ credits: (user.credits || 0) + amount })
      .where(eq(users.id, userId));
  }

  async deductCredits(userId: number, amount: number): Promise<void> {
    const result = await db.execute(sql`
      UPDATE users SET credits = credits - ${amount}
      WHERE id = ${userId} AND credits >= ${amount}
      RETURNING credits
    `);
    if (!result.rows || result.rows.length === 0) {
      throw new Error("Insufficient wheels");
    }
  }

  async getUserRedemptions(userId: number): Promise<UserRedemption[]> {
    return await db.select().from(userRedemptions).where(eq(userRedemptions.userId, userId));
  }

  async createCashout(cashout: InsertCashoutRequest): Promise<CashoutRequest> {
    const [created] = await db.insert(cashoutRequests).values(cashout).returning();
    return created;
  }

  async createCashoutAtomic(userId: number, amount: number, paymentMethod: string, paymentHandle: string): Promise<CashoutRequest> {
    const result = await db.execute(sql`
      UPDATE users SET credits = credits - ${amount}
      WHERE id = ${userId} AND credits >= ${amount}
      RETURNING credits
    `);
    if (!result.rows || result.rows.length === 0) {
      throw new Error("Insufficient Wheels balance");
    }
    const [created] = await db.insert(cashoutRequests).values({
      userId, amount, paymentMethod, paymentHandle,
    }).returning();
    return created;
  }

  async getUserCashouts(userId: number): Promise<CashoutRequest[]> {
    return await db.select().from(cashoutRequests)
      .where(eq(cashoutRequests.userId, userId))
      .orderBy(desc(cashoutRequests.createdAt));
  }

  async getAllCashouts(): Promise<(CashoutRequest & { username: string })[]> {
    const all = await db.select().from(cashoutRequests).orderBy(desc(cashoutRequests.createdAt));
    const result = [];
    for (const c of all) {
      const user = await this.getUser(c.userId);
      result.push({ ...c, username: user?.username || "unknown" });
    }
    return result;
  }

  async processCashout(id: number): Promise<CashoutRequest> {
    const [updated] = await db.update(cashoutRequests)
      .set({ status: "completed", processedAt: new Date() })
      .where(and(eq(cashoutRequests.id, id), eq(cashoutRequests.status, "pending")))
      .returning();
    if (!updated) throw new Error("Cashout not found or already processed");
    return updated;
  }

  async getAllRedemptions(): Promise<(UserRedemption & { username: string; rewardName: string })[]> {
    const all = await db.select().from(userRedemptions).orderBy(desc(userRedemptions.redeemedAt));
    const result = [];
    for (const r of all) {
      const user = await this.getUser(r.userId);
      const [reward] = await db.select().from(rewards).where(eq(rewards.id, r.rewardId));
      result.push({ ...r, username: user?.username || "unknown", rewardName: reward?.name || "Unknown Reward" });
    }
    return result;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [n] = await db.insert(notifications).values(notification).returning();
    return n;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number, userId: number): Promise<Notification> {
    const [n] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    if (!n) throw new Error("Notification not found");
    return n;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async createRating(rating: InsertHopBuddyRating): Promise<HopBuddyRating> {
    const [r] = await db.insert(hopBuddyRatings).values(rating).returning();
    return r;
  }

  async followUser(followerId: number, followingId: number): Promise<Follow> {
    const [f] = await db.insert(follows).values({ followerId, followingId }).returning();
    return f;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
  }

  async getFollows(userId: number): Promise<{ id: number; userId: number; username: string; isMutual: boolean }[]> {
    const following = await db.select({
      id: follows.id,
      followingId: follows.followingId,
      username: users.username,
    })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    const followers = await db.select({
      followerId: follows.followerId,
    })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const followerIds = new Set(followers.map(f => f.followerId));

    return following.map(f => ({
      id: f.id,
      userId: f.followingId,
      username: f.username,
      isMutual: followerIds.has(f.followingId),
    }));
  }

  async sendFriendRequest(requesterId: number, addresseeId: number): Promise<any> {
    const existing = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
        and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId))
      )
    );
    if (existing.length > 0) {
      if (existing[0].status === "accepted") throw new Error("Already friends");
      if (existing[0].status === "pending") throw new Error("Request already pending");
      if (existing[0].status === "declined") {
        const [updated] = await db.update(friendships)
          .set({ status: "pending", requesterId, addresseeId })
          .where(eq(friendships.id, existing[0].id))
          .returning();
        return updated;
      }
    }
    const [f] = await db.insert(friendships).values({ requesterId, addresseeId, status: "pending" }).returning();
    return f;
  }

  async respondFriendRequest(friendshipId: number, userId: number, accept: boolean): Promise<any> {
    const [friendship] = await db.select().from(friendships).where(eq(friendships.id, friendshipId));
    if (!friendship || friendship.addresseeId !== userId) throw new Error("Not authorized");
    if (friendship.status !== "pending") throw new Error("Request already handled");
    const [updated] = await db.update(friendships)
      .set({ status: accept ? "accepted" : "declined" })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return updated;
  }

  async getFriendRequests(userId: number): Promise<{ id: number; requesterId: number; username: string; profilePhoto: string | null; createdAt: Date | null }[]> {
    const requests = await db.select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      username: users.username,
      profilePhoto: users.profilePhoto,
      createdAt: friendships.createdAt,
    })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "pending")));
    return requests;
  }

  async getFriends(userId: number): Promise<{ id: number; friendId: number; username: string; profilePhoto: string | null }[]> {
    const sent = await db.select({
      id: friendships.id,
      friendId: friendships.addresseeId,
      username: users.username,
      profilePhoto: users.profilePhoto,
    })
      .from(friendships)
      .innerJoin(users, eq(friendships.addresseeId, users.id))
      .where(and(eq(friendships.requesterId, userId), eq(friendships.status, "accepted")));

    const received = await db.select({
      id: friendships.id,
      friendId: friendships.requesterId,
      username: users.username,
      profilePhoto: users.profilePhoto,
    })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "accepted")));

    return [...sent, ...received];
  }

  async getFriendCount(userId: number): Promise<number> {
    const result = await db.select({ count: count() }).from(friendships)
      .where(and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
      ));
    return result[0]?.count || 0;
  }

  async getFriendshipStatus(userId: number, otherUserId: number): Promise<string | null> {
    const result = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherUserId)),
        and(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, userId))
      )
    );
    if (result.length === 0) return null;
    const f = result[0];
    if (f.status === "accepted") return "friends";
    if (f.status === "pending" && f.requesterId === userId) return "pending_sent";
    if (f.status === "pending" && f.addresseeId === userId) return "pending_received";
    return f.status;
  }

  async areFriends(userId: number, otherUserId: number): Promise<boolean> {
    const result = await db.select().from(friendships).where(
      and(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherUserId)),
          and(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, userId))
        ),
        eq(friendships.status, "accepted")
      )
    );
    return result.length > 0;
  }

  async getDMConversations(userId: number): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (other_id) other_id, username, profile_photo, last_message, last_time, unread_count
      FROM (
        SELECT
          CASE WHEN dm.sender_id = ${userId} THEN dm.receiver_id ELSE dm.sender_id END AS other_id,
          u.username,
          u.profile_photo,
          dm.message AS last_message,
          dm.created_at AS last_time,
          CASE WHEN dm.sender_id != ${userId} AND dm.is_read = false THEN 1 ELSE 0 END AS unread_flag
        FROM direct_messages dm
        JOIN users u ON u.id = CASE WHEN dm.sender_id = ${userId} THEN dm.receiver_id ELSE dm.sender_id END
        WHERE dm.sender_id = ${userId} OR dm.receiver_id = ${userId}
        ORDER BY dm.created_at DESC
      ) sub
      CROSS JOIN LATERAL (
        SELECT COUNT(*) AS unread_count FROM direct_messages
        WHERE sender_id = sub.other_id AND receiver_id = ${userId} AND is_read = false
      ) uc
      ORDER BY other_id, last_time DESC
    `);
    return (rows as any).rows || rows;
  }

  async getDMMessages(userId: number, otherUserId: number): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT dm.id, dm.sender_id, dm.receiver_id, dm.message, dm.is_read, dm.created_at,
             u.username AS sender_username
      FROM direct_messages dm
      JOIN users u ON u.id = dm.sender_id
      WHERE (dm.sender_id = ${userId} AND dm.receiver_id = ${otherUserId})
         OR (dm.sender_id = ${otherUserId} AND dm.receiver_id = ${userId})
      ORDER BY dm.created_at ASC
    `);
    return (rows as any).rows || rows;
  }

  async markDMsRead(userId: number, senderId: number): Promise<void> {
    await db.execute(sql`
      UPDATE direct_messages SET is_read = true
      WHERE sender_id = ${senderId} AND receiver_id = ${userId} AND is_read = false
    `);
  }

  async sendDM(senderId: number, receiverId: number, message: string): Promise<any> {
    const rows = await db.execute(sql`
      INSERT INTO direct_messages (sender_id, receiver_id, message) VALUES (${senderId}, ${receiverId}, ${message}) RETURNING *
    `);
    return ((rows as any).rows || rows)[0];
  }

  async getUnreadDMCount(userId: number): Promise<number> {
    const rows = await db.execute(sql`
      SELECT COUNT(*) AS count FROM direct_messages WHERE receiver_id = ${userId} AND is_read = false
    `);
    return Number(((rows as any).rows || rows)[0]?.count || 0);
  }

  async getPublicProfiles(currentUserId: number): Promise<{ id: number; username: string; profilePhoto: string | null; bio: string | null; interests: string | null; profileVisibility: string | null; isFounder: boolean | null; founderBadge: string | null; subscription: string | null; totalHops: number | null; friendCount: number; idVerified: boolean | null }[]> {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      profilePhoto: users.profilePhoto,
      bio: users.bio,
      interests: users.interests,
      profileVisibility: users.profileVisibility,
      isFounder: users.isFounder,
      founderBadge: users.founderBadge,
      subscription: users.subscription,
      totalHops: users.totalHops,
      idVerified: users.idVerified,
    }).from(users)
      .where(and(
        sql`${users.id} != ${currentUserId}`,
        sql`(${users.profileVisibility} = 'public' OR ${users.profileVisibility} = 'semi_private')`,
        sql`${users.isDisabled} = false`
      ));

    const result = [];
    for (const u of allUsers) {
      const fc = await this.getFriendCount(u.id);
      result.push({ ...u, friendCount: fc });
    }
    return result;
  }

  async getCommunityPosts(): Promise<{ id: number; userId: number; content: string; createdAt: Date | null; username: string }[]> {
    const posts = await db.select({
      id: communityPosts.id,
      userId: communityPosts.userId,
      content: communityPosts.content,
      createdAt: communityPosts.createdAt,
      username: users.username,
    })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.userId, users.id))
      .orderBy(desc(communityPosts.createdAt));
    return posts;
  }

  async createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [p] = await db.insert(communityPosts).values(post).returning();
    return p;
  }

  async addToExpansionWaitlist(entry: InsertExpansionWaitlist): Promise<ExpansionWaitlist> {
    const [w] = await db.insert(expansionWaitlist).values(entry).returning();
    return w;
  }

  async updateHopStreak(userId: number): Promise<{ streak: number; totalHops: number; newBadges: string[] }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastHop = user.lastHopDate ? new Date(user.lastHopDate) : null;
    const oneDayAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    let newStreak = (user.hopStreak || 0) + 1;
    if (lastHop && lastHop < oneDayAgo) {
      newStreak = 1;
    }

    const newTotal = (user.totalHops || 0) + 1;

    await db.update(users).set({
      hopStreak: newStreak,
      totalHops: newTotal,
      lastHopDate: now,
    }).where(eq(users.id, userId));

    const milestones: Record<number, string> = {
      3: "🛞 3 Hop Club",
      10: "🛞 10 Hop Club",
      25: "🛞 25 Hop Club",
      50: "🛞 50 Hop Club",
      100: "🛞 100 Hop Club",
    };

    const newBadges: string[] = [];
    const existingBadges = await this.getUserBadges(userId);
    const existingNames = new Set(existingBadges.map(b => b.badge));

    for (const [threshold, badgeName] of Object.entries(milestones)) {
      if (newTotal >= parseInt(threshold) && !existingNames.has(badgeName)) {
        await this.awardBadge(userId, badgeName);
        newBadges.push(badgeName);
      }
    }

    return { streak: newStreak, totalHops: newTotal, newBadges };
  }

  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt));
  }

  async awardBadge(userId: number, badge: string): Promise<UserBadge> {
    const [b] = await db.insert(userBadges).values({ userId, badge }).returning();
    return b;
  }

  async getLeaderboard(): Promise<{
    mostHops: { username: string; totalHops: number; isDriver: boolean | null }[];
    topDrivers: { username: string; credits: number }[];
    communityHoppers: { username: string; postCount: number }[];
  }> {
    const excludeTest = sql`${users.username} NOT IN ('walker', 'driver')`;

    const mostHops = await db.select({
      username: users.username,
      totalHops: users.totalHops,
      isDriver: users.isDriver,
    })
      .from(users)
      .where(and(sql`${users.totalHops} > 0`, excludeTest))
      .orderBy(desc(users.totalHops))
      .limit(10);

    const topDrivers = await db.select({
      username: users.username,
      credits: users.credits,
    })
      .from(users)
      .where(and(eq(users.isDriver, true), excludeTest))
      .orderBy(desc(users.credits))
      .limit(10);

    const communityHoppers = await db.select({
      username: users.username,
      postCount: count(communityPosts.id),
    })
      .from(users)
      .innerJoin(communityPosts, eq(users.id, communityPosts.userId))
      .where(excludeTest)
      .groupBy(users.username)
      .orderBy(desc(count(communityPosts.id)))
      .limit(10);

    return {
      mostHops: mostHops.map(h => ({ ...h, totalHops: h.totalHops || 0 })),
      topDrivers: topDrivers.map(d => ({ ...d, credits: d.credits || 0 })),
      communityHoppers: communityHoppers.map(c => ({ ...c, postCount: Number(c.postCount) })),
    };
  }

  async processReferral(newUserId: number, referralCode: string): Promise<boolean> {
    const referrer = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
    if (!referrer.length) return false;

    const referrerId = referrer[0].id;
    if (referrerId === newUserId) return false;

    await db.update(users).set({ credits: sql`${users.credits} + 5` }).where(eq(users.id, referrerId));
    await db.update(users).set({ credits: sql`${users.credits} + 3`, referredBy: referralCode }).where(eq(users.id, newUserId));

    await this.createNotification({
      userId: referrerId,
      type: "referral",
      title: "Referral Reward! 🎉",
      message: "Someone joined ShortHop using your referral code! You earned 5 Wheels.",
      isRead: false,
    });

    await this.createNotification({
      userId: newUserId,
      type: "referral",
      title: "Welcome Bonus! 🎉",
      message: "You joined with a referral code and earned 3 bonus Wheels!",
      isRead: false,
    });

    return true;
  }

  async getNotificationCountToday(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db.select({ cnt: count(notifications.id) })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        sql`${notifications.createdAt} >= ${today}`
      ));
    return Number(result[0]?.cnt || 0);
  }

  async submitDriverApplication(userId: number): Promise<DriverApplication> {
    const existing = await db.select().from(driverApplications).where(eq(driverApplications.userId, userId));
    if (existing.length > 0) {
      const [updated] = await db.update(driverApplications)
        .set({ status: "pending", submittedAt: new Date(), reviewedAt: null, reviewedBy: null, notes: null })
        .where(eq(driverApplications.userId, userId))
        .returning();
      return updated;
    }
    const [app] = await db.insert(driverApplications).values({ userId, status: "pending" }).returning();
    return app;
  }

  async getDriverApplication(userId: number): Promise<DriverApplication | undefined> {
    const [app] = await db.select().from(driverApplications).where(eq(driverApplications.userId, userId));
    return app;
  }

  async getDriverApplications(): Promise<(DriverApplication & { username: string })[]> {
    const apps = await db.select().from(driverApplications).orderBy(desc(driverApplications.submittedAt));
    const result = [];
    for (const app of apps) {
      const user = await this.getUser(app.userId);
      result.push({ ...app, username: user?.username || "unknown" });
    }
    return result;
  }

  async reviewDriverApplication(appId: number, status: string, reviewerId: number, notes?: string): Promise<DriverApplication> {
    const [app] = await db.update(driverApplications)
      .set({ status, reviewedAt: new Date(), reviewedBy: reviewerId, notes: notes || null })
      .where(eq(driverApplications.id, appId))
      .returning();
    if (!app) throw new Error("Application not found");
    if (status === "approved") {
      await db.update(users).set({ driverVerified: true, isDriver: true }).where(eq(users.id, app.userId));
    }
    return app;
  }

  async setDriverActive(userId: number, active: boolean): Promise<User> {
    const [user] = await db.update(users).set({ isActive: active }).where(eq(users.id, userId)).returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async getActiveDrivers(): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.isActive, true), eq(users.isDriver, true)));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async disableUser(id: number, disabled: boolean): Promise<User> {
    const [user] = await db.update(users).set({ isDisabled: disabled }).where(eq(users.id, id)).returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async getSystemLogs(limit: number = 100): Promise<ShortHop[]> {
    return db.select().from(shortHops).orderBy(desc(shortHops.createdAt)).limit(limit);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(follows).where(or(eq(follows.followerId, id), eq(follows.followingId, id)));
    await db.delete(communityPosts).where(eq(communityPosts.userId, id));
    await db.delete(contactMessages).where(eq(contactMessages.userId, id));
    await db.delete(driverApplications).where(eq(driverApplications.userId, id));
    await db.delete(userBadges).where(eq(userBadges.userId, id));
    await db.delete(reports).where(or(eq(reports.userId, id), eq(reports.reportedUserId, id)));
    await db.delete(founderMessages).where(eq(founderMessages.userId, id));
    await db.delete(hopBuddyRatings).where(or(eq(hopBuddyRatings.raterId, id), eq(hopBuddyRatings.ratedUserId, id)));
    await db.delete(userRedemptions).where(eq(userRedemptions.userId, id));
    await db.delete(walkerRoutes).where(eq(walkerRoutes.userId, id));
    await db.delete(routineRoutes).where(eq(routineRoutes.driverId, id));
    await db.delete(donations).where(eq(donations.userId, id));
    await db.delete(shortHops).where(or(eq(shortHops.walkerId, id), eq(shortHops.driverId, id)));
    await db.delete(users).where(eq(users.id, id));
  }

  async getHop(id: number): Promise<ShortHop | undefined> {
    const [hop] = await db.select().from(shortHops).where(eq(shortHops.id, id));
    return hop;
  }

  async tipDriver(hopId: number, tipCents: number): Promise<void> {
    await db.update(shortHops).set({ tipCents }).where(eq(shortHops.id, hopId));
  }

  async createDonation(userId: number, amountCents: number, message: string | null): Promise<void> {
    await db.insert(donations).values({ userId, amountCents, message });
  }

  async createContactMessage(msg: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(msg).returning();
    return created;
  }

  async getContactMessages(): Promise<(ContactMessage & { username: string })[]> {
    const msgs = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
    const result = [];
    for (const msg of msgs) {
      const user = await this.getUser(msg.userId);
      result.push({ ...msg, username: user?.username || "unknown" });
    }
    return result;
  }

  async replyToContactMessage(id: number, reply: string): Promise<ContactMessage> {
    const [msg] = await db.update(contactMessages)
      .set({ adminReply: reply, status: "replied", repliedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    if (!msg) throw new Error("Message not found");
    return msg;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async getReports(): Promise<(Report & { username: string; reportedUsername?: string })[]> {
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const result = [];
    for (const r of allReports) {
      const user = await this.getUser(r.userId);
      let reportedUsername: string | undefined;
      if (r.reportedUserId) {
        const reported = await this.getUser(r.reportedUserId);
        reportedUsername = reported?.username;
      }
      result.push({ ...r, username: user?.username || "unknown", reportedUsername });
    }
    return result;
  }

  async resolveReport(id: number, notes: string): Promise<Report> {
    const [report] = await db.update(reports)
      .set({ status: "resolved", adminNotes: notes, resolvedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    if (!report) throw new Error("Report not found");
    return report;
  }

  async getFounderMessages(): Promise<(FounderMessage & { username: string })[]> {
    const msgs = await db.select().from(founderMessages).orderBy(desc(founderMessages.createdAt));
    const result = [];
    for (const msg of msgs) {
      const user = await this.getUser(msg.userId);
      result.push({ ...msg, username: user?.username || "unknown" });
    }
    return result;
  }

  async createFounderMessage(msg: InsertFounderMessage): Promise<FounderMessage> {
    const [created] = await db.insert(founderMessages).values(msg).returning();
    return created;
  }

  async getVipMessages(userId: number): Promise<(VipMessage & { username: string })[]> {
    const msgs = await db.select().from(vipMessages)
      .where(eq(vipMessages.userId, userId))
      .orderBy(desc(vipMessages.createdAt));
    const result = [];
    for (const msg of msgs) {
      const user = await this.getUser(msg.userId);
      result.push({ ...msg, username: user?.username || "unknown" });
    }
    return result;
  }

  async createVipMessage(msg: InsertVipMessage): Promise<VipMessage> {
    const [created] = await db.insert(vipMessages).values(msg).returning();
    return created;
  }

  async getVipConversations(): Promise<{ userId: number; username: string; lastMessage: string; lastAt: string; unread: number }[]> {
    const allMsgs = await db.select().from(vipMessages).orderBy(desc(vipMessages.createdAt));
    const convos = new Map<number, { userId: number; lastMessage: string; lastAt: string; unread: number }>();
    for (const msg of allMsgs) {
      if (!convos.has(msg.userId)) {
        const userMsgs = allMsgs.filter(m => m.userId === msg.userId);
        const lastAdminIdx = userMsgs.findIndex(m => m.isAdminReply);
        const unread = lastAdminIdx === -1 ? userMsgs.filter(m => !m.isAdminReply).length : userMsgs.slice(0, lastAdminIdx).filter(m => !m.isAdminReply).length;
        convos.set(msg.userId, {
          userId: msg.userId,
          lastMessage: msg.message.substring(0, 80),
          lastAt: msg.createdAt?.toISOString() || new Date().toISOString(),
          unread,
        });
      }
    }
    const result = [];
    for (const [userId, c] of convos) {
      const user = await this.getUser(userId);
      result.push({ ...c, username: user?.username || "unknown" });
    }
    return result;
  }

  async getWidgetData(userId: number): Promise<{
    role: "driver" | "hopper";
    directionLabel: string;
    directionCount: number;
    nearbyActive: number;
    driversInArea: number;
    isActive: boolean;
  }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const role = user.isDriver ? "driver" as const : "hopper" as const;
    const activeDrivers = await this.getActiveDrivers();
    const allUsers = await db.select().from(users);
    const realUsers = allUsers.filter(u => !["walker", "driver"].includes(u.username));

    const routes = user.isDriver
      ? await db.select().from(routineRoutes).where(eq(routineRoutes.driverId, userId))
      : await db.select().from(walkerRoutes).where(eq(walkerRoutes.userId, userId));

    let directionLabel = "Downtown Lexington";
    if (routes.length > 0) {
      const route = routes[0];
      directionLabel = "endLocation" in route ? (route as any).endLocation || "Downtown" : (route as any).destination || "Downtown";
    }

    const availableHops = await db.select().from(shortHops).where(eq(shortHops.status, "requested"));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayHops = availableHops.filter(h => h.createdAt && new Date(h.createdAt) >= todayStart);

    const directionCount = Math.max(todayHops.length, Math.floor(realUsers.length * 0.3));
    const nearbyActive = realUsers.filter(u => u.isActive || u.isDriver).length;

    return {
      role,
      directionLabel,
      directionCount,
      nearbyActive,
      driversInArea: activeDrivers.length,
      isActive: user.isActive ?? false,
    };
  }

  async getUserSchedules(userId: number): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.userId, userId)).orderBy(desc(schedules.createdAt));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [created] = await db.insert(schedules).values(schedule).returning();
    return created;
  }

  async updateSchedule(id: number, userId: number, updates: Partial<Schedule>): Promise<Schedule> {
    const [updated] = await db.update(schedules)
      .set(updates)
      .where(and(eq(schedules.id, id), eq(schedules.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSchedule(id: number, userId: number): Promise<void> {
    await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.userId, userId)));
  }

  async getScheduleMatches(userId: number, day: string, timeStart: string, timeEnd: string): Promise<Schedule[]> {
    const allSchedules = await db.select().from(schedules)
      .where(and(eq(schedules.active, true)));
    return allSchedules.filter(s => {
      if (s.userId === userId) return false;
      const days = s.days as string[];
      if (!days.includes(day)) return false;
      const sStart = parseInt(s.timeStart.replace(':', ''));
      const sEnd = parseInt(s.timeEnd.replace(':', ''));
      const qStart = parseInt(timeStart.replace(':', ''));
      const qEnd = parseInt(timeEnd.replace(':', ''));
      return sStart <= qEnd && sEnd >= qStart;
    });
  }

  async getAllActiveSchedulesForDay(day: string): Promise<(Schedule & { username: string })[]> {
    const allSchedules = await db.select({
      schedule: schedules,
      username: users.username,
    }).from(schedules)
      .innerJoin(users, eq(schedules.userId, users.id))
      .where(eq(schedules.active, true));
    return allSchedules
      .filter(s => (s.schedule.days as string[]).includes(day))
      .map(s => ({ ...s.schedule, username: s.username }));
  }

  async getUserCompletedHopCount(userId: number): Promise<number> {
    const result = await db.select({ count: count() }).from(shortHops)
      .where(and(eq(shortHops.walkerId, userId), eq(shortHops.status, "completed")));
    return result[0]?.count || 0;
  }

  async startRide(hopId: number): Promise<ShortHop> {
    const [updated] = await db.update(shortHops)
      .set({ status: "in_ride", rideStartedAt: new Date() })
      .where(eq(shortHops.id, hopId))
      .returning();
    if (!updated) throw new Error("Hop not found");
    return updated;
  }

  async getAmbassadors(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isAmbassador, true));
  }

  async setAmbassador(userId: number, isAmbassador: boolean): Promise<User> {
    const [updated] = await db.update(users)
      .set({ isAmbassador })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getAmbassadorRequests(): Promise<(AmbassadorRequest & { ambassadorUsername: string; targetUsername: string })[]> {
    const ambassadorUser = db.select({ id: users.id, username: users.username }).from(users).as("ambassadorUser");
    const targetUser = db.select({ id: users.id, username: users.username }).from(users).as("targetUser");

    const results = await db.select({
      request: ambassadorRequests,
      ambassadorUsername: ambassadorUser.username,
      targetUsername: targetUser.username,
    })
      .from(ambassadorRequests)
      .innerJoin(ambassadorUser, eq(ambassadorRequests.ambassadorId, ambassadorUser.id))
      .innerJoin(targetUser, eq(ambassadorRequests.targetUserId, targetUser.id))
      .orderBy(desc(ambassadorRequests.createdAt));

    return results.map(r => ({
      ...r.request,
      ambassadorUsername: r.ambassadorUsername,
      targetUsername: r.targetUsername,
    }));
  }

  async createAmbassadorRequest(request: InsertAmbassadorRequest): Promise<AmbassadorRequest> {
    const [created] = await db.insert(ambassadorRequests).values(request).returning();
    return created;
  }

  async reviewAmbassadorRequest(id: number, status: string, adminNotes?: string): Promise<AmbassadorRequest> {
    const [updated] = await db.update(ambassadorRequests)
      .set({ status, adminNotes: adminNotes || null, reviewedAt: new Date() })
      .where(eq(ambassadorRequests.id, id))
      .returning();
    if (!updated) throw new Error("Ambassador request not found");
    return updated;
  }

  async getPolicy(policyType: string): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.policyType, policyType));
    return policy;
  }

  async updatePolicy(policyType: string, content: string): Promise<Policy> {
    const [existing] = await db.select().from(policies).where(eq(policies.policyType, policyType));
    if (existing) {
      const [updated] = await db.update(policies)
        .set({ content, updatedAt: new Date() })
        .where(eq(policies.policyType, policyType))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(policies).values({ policyType, content }).returning();
      return created;
    }
  }

  async getAllPolicies(): Promise<Policy[]> {
    return db.select().from(policies);
  }

  async getFreeRideList(driverId: number): Promise<{ id: number; riderId: number; username: string; createdAt: Date | null }[]> {
    const rows = await db
      .select({
        id: freeRideList.id,
        riderId: freeRideList.riderId,
        username: users.username,
        createdAt: freeRideList.createdAt,
      })
      .from(freeRideList)
      .innerJoin(users, eq(freeRideList.riderId, users.id))
      .where(eq(freeRideList.driverId, driverId));
    return rows;
  }

  async addFreeRideUser(driverId: number, riderId: number): Promise<any> {
    const [entry] = await db.insert(freeRideList).values({ driverId, riderId }).returning();
    return entry;
  }

  async removeFreeRideUser(driverId: number, riderId: number): Promise<void> {
    await db.delete(freeRideList).where(
      and(eq(freeRideList.driverId, driverId), eq(freeRideList.riderId, riderId))
    );
  }

}

export const storage = new DatabaseStorage();
