import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";
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
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFlexibility(id: number, updates: any): Promise<User>;
  updateUserPreferences(id: number, updates: { rideVibe?: string; tier?: string }): Promise<User>;

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
}

export const storage = new DatabaseStorage();
