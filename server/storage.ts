import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  routineRoutes,
  shortHops,
  rewards,
  userRedemptions,
  type User,
  type InsertUser,
  type RoutineRoute,
  type InsertRoutineRoute,
  type ShortHop,
  type InsertShortHop,
  type Reward,
  type UserRedemption,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFlexibility(id: number, updates: any): Promise<User>;

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
}

export const storage = new DatabaseStorage();