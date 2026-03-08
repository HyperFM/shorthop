import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  routineRoutes,
  shortHops,
  type User,
  type InsertUser,
  type RoutineRoute,
  type InsertRoutineRoute,
  type ShortHop,
  type InsertShortHop
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFlexibility(id: number, updates: any): Promise<User>;

  // Routes
  getRoutes(driverId: number): Promise<RoutineRoute[]>;
  createRoute(route: InsertRoutineRoute): Promise<RoutineRoute>;
  deleteRoute(id: number): Promise<void>;

  // Hops
  getHopsForWalker(walkerId: number): Promise<ShortHop[]>;
  getHopsForDriver(driverId: number): Promise<ShortHop[]>;
  getAvailableHops(): Promise<ShortHop[]>;
  createHop(hop: InsertShortHop): Promise<ShortHop>;
  acceptHop(hopId: number, driverId: number): Promise<ShortHop>;
  completeHop(hopId: number, distanceMiles: string): Promise<ShortHop>;
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
          const creditsToAdd = Math.ceil(parseFloat(distanceMiles));
          await db.update(users)
            .set({ credits: (driver.credits || 0) + creditsToAdd })
            .where(eq(users.id, driver.id));
       }
    }

    return updatedHop;
  }
}

export const storage = new DatabaseStorage();