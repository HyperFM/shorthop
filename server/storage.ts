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
  communityPosts,
  expansionWaitlist,
  userBadges,
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
  type CommunityPost,
  type InsertCommunityPost,
  type InsertExpansionWaitlist,
  type ExpansionWaitlist,
  type UserBadge,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserFlexibility(id: number, updates: any): Promise<User>;
  updateUserPreferences(id: number, updates: { rideVibe?: string; tier?: string }): Promise<User>;
  dismissWelcome(id: number): Promise<void>;
  getNetworkStats(): Promise<{ totalUsers: number; totalDrivers: number; totalHoppers: number; nextMilestone: number; foundingHoppersRemaining: number; foundingDriversRemaining: number }>;
  checkAndAssignFounderStatus(userId: number, isDriver: boolean): Promise<User>;

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

  getRewards(): Promise<Reward[]>;
  redeemReward(userId: number, rewardId: number): Promise<{ code: string; reward: Reward }>;
  getUserRedemptions(userId: number): Promise<UserRedemption[]>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<Notification>;
  markAllNotificationsRead(userId: number): Promise<void>;

  createRating(rating: InsertHopBuddyRating): Promise<HopBuddyRating>;

  followUser(followerId: number, followingId: number): Promise<Follow>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  getFollows(userId: number): Promise<{ id: number; userId: number; username: string; isMutual: boolean }[]>;

  getCommunityPosts(): Promise<{ id: number; userId: number; content: string; createdAt: Date | null; username: string }[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
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
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserPreferences(id: number, updates: { rideVibe?: string; tier?: string }): Promise<User> {
    const setValues: any = {};
    if (updates.rideVibe) setValues.rideVibe = updates.rideVibe;
    if (updates.tier) setValues.tier = updates.tier;
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

  async getNetworkStats(): Promise<{ totalUsers: number; totalDrivers: number; totalHoppers: number; nextMilestone: number; foundingHoppersRemaining: number; foundingDriversRemaining: number }> {
    const TEST_ACCOUNTS = ["walker", "driver"];
    const allUsers = (await db.select().from(users)).filter(u => !TEST_ACCOUNTS.includes(u.username));
    const totalUsers = allUsers.length;
    const totalDrivers = allUsers.filter(u => u.isDriver).length;
    const totalHoppers = allUsers.filter(u => !u.isDriver).length;

    const milestones = [10, 25, 50, 100, 250, 500, 1000, 2000, 3000, 5000];
    const nextMilestone = milestones.find(m => m > totalUsers) || 5000;

    const foundingDrivers = allUsers.filter(u => u.isDriver && u.isFounder).length;
    const foundingHoppers = allUsers.filter(u => !u.isDriver && u.isFounder).length;

    return {
      totalUsers,
      totalDrivers,
      totalHoppers,
      nextMilestone,
      foundingHoppersRemaining: Math.max(0, 20 - foundingHoppers),
      foundingDriversRemaining: Math.max(0, 20 - foundingDrivers),
    };
  }

  async checkAndAssignFounderStatus(userId: number, isDriver: boolean): Promise<User> {
    const allUsers = await db.select().from(users);
    const founderCount = allUsers.filter(u =>
      u.isFounder && (isDriver ? u.isDriver : !u.isDriver)
    ).length;

    if (founderCount < 20) {
      const badge = isDriver ? "Founding Driver" : "Founding Hopper";
      const tier = isDriver ? "flexhop" : "flexhop";
      const [updated] = await db.update(users)
        .set({ isFounder: true, founderBadge: badge, tier })
        .where(eq(users.id, userId))
        .returning();
      return updated;
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
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
    
    if (updatedHop.driverId) {
       const driver = await this.getUser(updatedHop.driverId);
       if (driver) {
          const wheelsToAdd = Math.ceil(parseFloat(distanceMiles));
          await db.update(users)
            .set({ credits: (driver.credits || 0) + wheelsToAdd })
            .where(eq(users.id, driver.id));
       }
    }

    return updatedHop;
  }

  async getRewards(): Promise<Reward[]> {
    return await db.select().from(rewards).where(eq(rewards.isAvailable, true));
  }

  async redeemReward(userId: number, rewardId: number): Promise<{ code: string; reward: Reward }> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId));
    if (!reward) throw new Error("Reward not found");

    const user = await this.getUser(userId);
    if (!user || user.credits < reward.wheelsCost) {
      throw new Error("Insufficient wheels");
    }

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await db.insert(userRedemptions).values({
      userId,
      rewardId,
      code,
    });

    await db.update(users)
      .set({ credits: user.credits - reward.wheelsCost })
      .where(eq(users.id, userId));

    return { code, reward };
  }

  async getUserRedemptions(userId: number): Promise<UserRedemption[]> {
    return await db.select().from(userRedemptions).where(eq(userRedemptions.userId, userId));
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

  async markNotificationRead(id: number): Promise<Notification> {
    const [n] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
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
}

export const storage = new DatabaseStorage();
