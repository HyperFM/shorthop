import { db } from "./server/db";
import { users, routineRoutes, shortHops } from "./shared/schema";

async function seed() {
  console.log("Seeding database...");
  
  const [walker] = await db.insert(users).values({
    username: "walker",
    password: "password",
    isDriver: false,
    credits: 0
  }).onConflictDoNothing().returning();

  const [driver] = await db.insert(users).values({
    username: "driver",
    password: "password",
    isDriver: true,
    credits: 10
  }).onConflictDoNothing().returning();

  if (driver) {
    await db.insert(routineRoutes).values({
      driverId: driver.id,
      name: "Morning Commute",
      startLocation: "Downtown",
      endLocation: "Tech Park",
      startTime: "08:00",
      endTime: "09:00",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      isActive: true
    }).onConflictDoNothing();
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(console.error);