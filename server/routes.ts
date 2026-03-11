import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      isDriver: boolean | null;
      tier: string | null;
    }
  }
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: number;
}

const liveLocations = new Map<number, UserLocation>();

const LEXINGTON_PICKUP_SPOTS = [
  { name: "Nicholasville Rd & Reynolds Rd", lat: 38.0126, lng: -84.5078, desc: "High traffic corridor — drivers pass every few minutes" },
  { name: "Richmond Rd near Kroger", lat: 38.0280, lng: -84.4752, desc: "Busy shopping area with steady driver flow" },
  { name: "New Circle Rd & Tates Creek", lat: 38.0092, lng: -84.4926, desc: "Major intersection — great for catching commuters" },
  { name: "Main St & Broadway", lat: 38.0496, lng: -84.4983, desc: "Downtown hub — lots of drivers during rush hours" },
  { name: "Limestone & Euclid (UK Campus)", lat: 38.0382, lng: -84.5040, desc: "Campus area — frequent short trips available" },
  { name: "Man o' War Blvd & Nicholasville", lat: 37.9890, lng: -84.5264, desc: "Busy retail corridor — consistent traffic" },
  { name: "Versailles Rd near Keeneland", lat: 38.0504, lng: -84.5336, desc: "West side commuter route" },
  { name: "Harrodsburg Rd & Lane Allen", lat: 38.0178, lng: -84.5300, desc: "Popular commuter path through south Lexington" },
  { name: "Leestown Rd & Georgetown", lat: 38.0640, lng: -84.5150, desc: "North side connector — steady morning traffic" },
  { name: "Winchester Rd near I-75", lat: 38.0550, lng: -84.4650, desc: "East side highway access — lots of commuters" },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  if (bearing < 45 || bearing >= 315) return "north";
  if (bearing < 135) return "east";
  if (bearing < 225) return "south";
  return "west";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const PgStore = connectPgSimple(session);
  const sessionPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgStore({
        pool: sessionPool,
        createTableIfMissing: true,
        tableName: 'session',
      }),
      secret: process.env.SESSION_SECRET || 'dev_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || user.password !== password) {
          return done(null, false);
        }
        if (user.isDisabled) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth
  const LAUNCH_CITIES_AUTH = ["lexington"];

  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const { username, password, isDriver, city, referralCode: refCode, referredBy: refBy } = req.body;
      const referralInput = refCode || refBy || null;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const cityStr = (city || "").trim().toLowerCase();
      if (!cityStr || !LAUNCH_CITIES_AUTH.some(c => cityStr.includes(c))) {
        return res.status(409).json({ message: "ShortHop is not yet available in your city. Join our waitlist to be notified!", unavailableCity: true });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username exists" });
      }
      const userReferralCode = "SH" + username.slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
      let user = await storage.createUser({
        username, password, isDriver: !!isDriver,
        city: city?.trim() || null,
        referralCode: userReferralCode,
        referredBy: referralInput || null,
      });
      user = await storage.checkAndAssignFounderStatus(user.id, !!user.isDriver);

      if (referralInput) {
        await storage.processReferral(user.id, referralInput);
      }

      await storage.createNotification({
        userId: user.id,
        type: "welcome",
        title: "Welcome to ShortHop! 🛞",
        message: "You're one of the early people helping bring ShortHop to life in Lexington.",
        isRead: false,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      res.status(200).json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  // Routes
  app.get(api.routes.list.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isDriver) {
      return res.status(401).json({ message: "Unauthorized or not a driver" });
    }
    const routes = await storage.getRoutes(req.user.id);
    res.json(routes);
  });

  app.post(api.routes.create.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isDriver) {
      return res.status(401).json({ message: "Unauthorized or not a driver" });
    }
    try {
      const input = api.routes.create.input.parse(req.body);
      const route = await storage.createRoute({ ...input, driverId: req.user.id });
      res.status(201).json(route);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.delete(api.routes.delete.path, async (req, res) => {
     if (!req.isAuthenticated()) return res.sendStatus(401);
     await storage.deleteRoute(Number(req.params.id));
     res.sendStatus(204);
  });

  // Hops
  app.get(api.hops.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    if (req.user.isDriver) {
      const availableHops = await storage.getAvailableHops();
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const availableIds = new Set(availableHops.map(h => h.id));
      const mergedHops = [
        ...availableHops,
        ...driverHops.filter(h => !availableIds.has(h.id)),
      ];

      if (availableHops.length > 0) {
        const todayCount = await storage.getNotificationCountToday(req.user.id);
        if (todayCount < 5 && Math.random() < 0.3) {
          const messages = [
            `${availableHops.length} Hopper${availableHops.length > 1 ? 's are' : ' is'} moving along your usual route.`,
            "You're near a busy route — want to go active?",
            "Hoppers are nearby along your route today.",
          ];
          await storage.createNotification({
            userId: req.user.id,
            type: "busy_route",
            title: "Route Activity 🛞",
            message: messages[Math.floor(Math.random() * messages.length)],
            isRead: false,
          });
        }
      }

      res.json(mergedHops);
    } else {
      const hops = await storage.getHopsForWalker(req.user.id);
      res.json(hops);
    }
  });

  app.post(api.hops.requestMovement.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.hops.requestMovement.input.parse(req.body);

      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      if (input.hopType === "flex_hop" && currentUser.subscription !== "flex_hop" && currentUser.subscription !== "power_hop") {
        return res.status(403).json({ message: "Flex Hop requires an active Flex Hop or Power Hop subscription." });
      }
      if (input.hopType === "full_ride" && currentUser.subscription !== "power_hop") {
        return res.status(403).json({ message: "Power Hop requires an active Power Hop subscription." });
      }
      
      let priceCents = 0;
      if (input.hopType === "short_hop") {
        priceCents = Math.floor((parseFloat(input.distanceMiles || "1") * 150));
      } else if (input.hopType === "flex_hop") {
        priceCents = Math.floor((parseFloat(input.distanceMiles || "1") * 200));
      } else if (input.hopType === "full_ride") {
        priceCents = Math.floor((parseFloat(input.distanceMiles || "5") * 150));
      }

      const hop = await storage.createHop({
        walkerId: req.user.id,
        driverId: null,
        status: "requested",
        hopType: input.hopType as any,
        startLocation: input.startLocation,
        endLocation: input.endLocation,
        distanceMiles: input.distanceMiles ? (input.distanceMiles as any) : null,
        priceCents,
        detourDistance: null
      });
      res.status(201).json(hop);
    } catch (err) {
       if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.post(api.hops.accept.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isDriver) return res.status(401).json({ message: "Unauthorized" });
    try {
       const driver = await storage.getUser(req.user.id);
       if (!driver) return res.status(404).json({ message: "User not found" });
       if (driver.isDisabled) return res.status(403).json({ message: "Account disabled" });
       if (!driver.driverVerified) return res.status(403).json({ message: "Driver not verified" });
       if (!driver.isActive) return res.status(403).json({ message: "Go active first to accept hops" });
       const hop = await storage.acceptHop(Number(req.params.id), req.user.id);
       res.json(hop);
    } catch (e) {
       res.status(404).json({ message: "Hop not found" });
    }
  });

  app.post(api.hops.complete.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isDriver) return res.status(401).json({ message: "Unauthorized" });
    try {
       const input = api.hops.complete.input.parse(req.body);
       const existingHops = await storage.getHopsForDriver(req.user.id);
       const targetHop = existingHops.find(h => h.id === Number(req.params.id) && h.status === "matched");
       if (!targetHop) return res.status(403).json({ message: "Not authorized to complete this hop" });
       const hop = await storage.completeHop(Number(req.params.id), input.distanceMiles);

       const driverStreak = await storage.updateHopStreak(req.user.id);
       for (const badge of driverStreak.newBadges) {
         const todayCount = await storage.getNotificationCountToday(req.user.id);
         if (todayCount < 5) {
           await storage.createNotification({
             userId: req.user.id,
             type: "badge",
             title: "New Badge Earned! 🏆",
             message: `You earned: ${badge}`,
             isRead: false,
           });
         }
       }

       if (hop.walkerId) {
         const walkerStreak = await storage.updateHopStreak(hop.walkerId);
         for (const badge of walkerStreak.newBadges) {
           const todayCount = await storage.getNotificationCountToday(hop.walkerId);
           if (todayCount < 5) {
             await storage.createNotification({
               userId: hop.walkerId,
               type: "badge",
               title: "New Badge Earned! 🏆",
               message: `You earned: ${badge}`,
               isRead: false,
             });
           }
         }
       }

       res.json(hop);
    } catch (e) {
       res.status(404).json({ message: "Hop not found" });
    }
  });

  app.post('/api/hops/:id/cancel', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hop = await storage.cancelHop(Number(req.params.id), req.user.id);
      res.json(hop);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to cancel hop" });
    }
  });

  app.get('/api/walker-routes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const routes = await storage.getWalkerRoutes(req.user.id);
      res.json(routes);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  app.post('/api/walker-routes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const name = (req.body.name || "").trim();
    const startLocation = (req.body.startLocation || "").trim();
    const endLocation = (req.body.endLocation || "").trim();
    if (!name || !startLocation || !endLocation) {
      return res.status(400).json({ message: "Name, start and end locations required" });
    }
    try {
      const route = await storage.createWalkerRoute({ userId: req.user.id, name, startLocation, endLocation });
      res.json(route);
    } catch (e) {
      res.status(500).json({ message: "Failed to save route" });
    }
  });

  app.delete('/api/walker-routes/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.deleteWalkerRoute(Number(req.params.id), req.user.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // Rewards
  app.get(api.rewards.list.path, async (req, res) => {
    try {
      const rewardsAvailable = await storage.getRewards();
      res.json(rewardsAvailable);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  app.post(api.rewards.redeem.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const result = await storage.redeemReward(req.user.id, Number(req.params.id));
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Insufficient")) {
        res.status(400).json({ message: "Not enough wheels" });
      } else {
        res.status(404).json({ message: "Reward not found" });
      }
    }
  });

  // Notifications
  app.get(api.notifications.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const notifs = await storage.getUserNotifications(req.user.id);
    res.json(notifs);
  });

  app.post(api.notifications.markAllRead.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    await storage.markAllNotificationsRead(req.user.id);
    res.json({ message: "All notifications marked as read" });
  });

  app.post(api.notifications.markRead.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const notif = await storage.markNotificationRead(Number(req.params.id));
      res.json(notif);
    } catch (e) {
      res.status(404).json({ message: "Notification not found" });
    }
  });

  // Driver flexibility settings
  app.put(api.driver.updateFlexibility.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isDriver) {
      return res.status(401).json({ message: "Unauthorized or not a driver" });
    }
    try {
      const input = api.driver.updateFlexibility.input.parse(req.body);
      const user = await storage.updateUserFlexibility(req.user.id, input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  // Community
  app.get(api.community.list.path, async (req, res) => {
    try {
      const posts = await storage.getCommunityPosts();
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post(api.community.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user || user.tier !== "flexhop") {
      return res.status(403).json({ message: "FlexHop membership required to post" });
    }
    try {
      const input = api.community.create.input.parse(req.body);
      const post = await storage.createCommunityPost({ userId: req.user.id, content: input.content });
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to create post" });
      }
    }
  });

  // Follows
  app.get(api.follows.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user || user.tier !== "flexhop") {
      return res.status(403).json({ message: "FlexHop membership required" });
    }
    try {
      const followsList = await storage.getFollows(req.user.id);
      res.json(followsList);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch follows" });
    }
  });

  app.post(api.follows.follow.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user || user.tier !== "flexhop") {
      return res.status(403).json({ message: "FlexHop membership required to follow users" });
    }
    const targetId = Number(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }
    try {
      const follow = await storage.followUser(req.user.id, targetId);
      res.status(201).json(follow);
    } catch (err) {
      res.status(400).json({ message: "Already following this user" });
    }
  });

  app.delete(api.follows.unfollow.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.unfollowUser(req.user.id, Number(req.params.id));
      res.json({ message: "Unfollowed" });
    } catch (err) {
      res.status(404).json({ message: "Follow not found" });
    }
  });

  // Ratings
  app.post(api.ratings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.ratings.create.input.parse(req.body);

      const allHops = [...await storage.getHopsForWalker(req.user.id), ...await storage.getHopsForDriver(req.user.id)];
      const trip = allHops.find(h => h.id === input.tripId && h.status === "completed");
      if (!trip) {
        return res.status(400).json({ message: "Trip not found or not completed" });
      }

      const isWalker = trip.walkerId === req.user.id;
      const isDriver = trip.driverId === req.user.id;
      if (!isWalker && !isDriver) {
        return res.status(400).json({ message: "You did not participate in this trip" });
      }

      const expectedRatedUser = isWalker ? trip.driverId : trip.walkerId;
      if (input.ratedUserId !== expectedRatedUser) {
        return res.status(400).json({ message: "Invalid rated user for this trip" });
      }

      const rating = await storage.createRating({
        tripId: input.tripId,
        raterId: req.user.id,
        ratedUserId: input.ratedUserId,
        rating: input.rating,
        wantRideAgain: input.wantRideAgain || false,
      });
      res.status(201).json(rating);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to create rating" });
      }
    }
  });

  // Profile preferences
  app.put(api.profile.updatePreferences.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.profile.updatePreferences.input.parse(req.body);
      const user = await storage.updateUserPreferences(req.user.id, input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to update preferences" });
      }
    }
  });

  app.post(api.profile.dismissWelcome.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    await storage.dismissWelcome(req.user.id);
    res.json({ message: "Welcome dismissed" });
  });

  // Network stats
  app.get(api.network.stats.path, async (_req, res) => {
    try {
      const stats = await storage.getNetworkStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch network stats" });
    }
  });

  // Leaderboard
  app.get(api.leaderboard.get.path, async (_req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Badges
  app.get(api.badges.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const badges = await storage.getUserBadges(req.user.id);
      res.json(badges);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Referral
  app.post(api.referral.apply.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { referralCode } = req.body;
      if (!referralCode) return res.status(400).json({ message: "Referral code is required" });
      const user = await storage.getUser(req.user.id);
      if (user?.referredBy) return res.status(400).json({ message: "You've already used a referral code" });
      const success = await storage.processReferral(req.user.id, referralCode);
      if (!success) return res.status(400).json({ message: "Invalid referral code" });
      res.json({ message: "Referral applied! You both earned Wheels." });
    } catch (err) {
      res.status(500).json({ message: "Failed to apply referral" });
    }
  });

  // Subscription
  app.post(api.subscription.subscribe.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    let plan: string;
    try {
      const parsed = api.subscription.subscribe.input.parse(req.body);
      plan = parsed.plan;
    } catch (err) {
      return res.status(400).json({ message: "Invalid plan" });
    }
    try {
      const updated = await storage.updateUser(req.user.id, {
        subscription: plan,
        subscriptionStartDate: new Date(),
      });
      await storage.createNotification({
        userId: req.user.id,
        type: "subscription",
        title: "Subscription Activated",
        message: `Your ${plan === "flex_hop" ? "Flex Hop ($5/mo)" : "Power Hop ($15/mo)"} subscription is now active!`,
        isRead: false,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  app.delete(api.subscription.cancel.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.updateUser(req.user.id, {
        subscription: null,
        subscriptionStartDate: null,
      });
      res.json({ message: "Subscription cancelled" });
    } catch (err) {
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post('/api/toggle-driver-mode', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { enable } = req.body;
    if (typeof enable !== 'boolean') return res.status(400).json({ message: "Invalid request" });

    const user = req.user;

    if (enable) {
      const canEnable = user.isFounder || user.subscription === 'flex_hop' || user.subscription === 'power_hop';
      if (!canEnable) {
        return res.status(403).json({ message: "Flex Hop subscription required to enable Drive Mode. Founding members get this free." });
      }
    }

    try {
      const updated = await storage.toggleDriverMode(user.id, enable);

      if (enable && !user.isDriver) {
        await storage.createNotification({
          userId: user.id,
          type: "driver_mode",
          title: "Drive Mode Activated",
          message: "You can now accept hop requests from riders along your commute. Set up your routine routes to get started!",
          isRead: false,
        });
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to toggle driver mode" });
    }
  });

  app.post('/api/location', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { latitude, longitude, accuracy } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }
    liveLocations.set(req.user.id, { latitude, longitude, accuracy: accuracy || 0, updatedAt: Date.now() });
    res.json({ ok: true });
  });

  app.get('/api/hops/:id/tracking', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const walkerHops = await storage.getHopsForWalker(req.user.id);
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const hop = [...walkerHops, ...driverHops].find(h => h.id === hopId && h.status === 'matched');
      if (!hop) return res.status(404).json({ message: "No active matched hop" });

      const isWalker = hop.walkerId === req.user.id;
      const partnerId = isWalker ? hop.driverId : hop.walkerId;
      if (!partnerId) return res.json({ available: false });

      const partnerLoc = liveLocations.get(partnerId);
      const myLoc = liveLocations.get(req.user.id);

      if (!partnerLoc || Date.now() - partnerLoc.updatedAt > 60000) {
        return res.json({ available: false });
      }

      let distance = null;
      let direction = null;
      if (myLoc && Date.now() - myLoc.updatedAt < 60000) {
        distance = getDistance(myLoc.latitude, myLoc.longitude, partnerLoc.latitude, partnerLoc.longitude);
        direction = getBearing(myLoc.latitude, myLoc.longitude, partnerLoc.latitude, partnerLoc.longitude);
      }

      res.json({
        available: true,
        distance: distance !== null ? Math.round(distance * 100) / 100 : null,
        direction,
        partnerRole: isWalker ? "driver" : "walker",
        updatedAt: partnerLoc.updatedAt,
        partnerLat: partnerLoc.latitude,
        partnerLng: partnerLoc.longitude,
      });
    } catch {
      res.status(500).json({ message: "Tracking error" });
    }
  });

  app.get('/api/pickup-guidance', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.json({ spots: LEXINGTON_PICKUP_SPOTS.slice(0, 3) });
    }

    const spotsWithDistance = LEXINGTON_PICKUP_SPOTS
      .map(s => ({ ...s, distance: getDistance(lat, lng, s.lat, s.lng) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    res.json({ spots: spotsWithDistance });
  });

  // Driver Onboarding & Profile
  app.post('/api/driver/profile', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { vehicleMake, vehicleModel, vehicleColor, licensePlate, driverLicenseUrl, selfieUrl, agreedToTerms } = req.body;
      const updated = await storage.updateUser(req.user.id, {
        vehicleMake, vehicleModel, vehicleColor, licensePlate,
        driverLicenseUrl: driverLicenseUrl || null,
        selfieUrl: selfieUrl || null,
        agreedToTerms: agreedToTerms || false,
        isDriver: true,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update driver profile" });
    }
  });

  app.post('/api/driver/apply', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.vehicleMake || !user?.licensePlate) {
        return res.status(400).json({ message: "Complete your vehicle profile first" });
      }
      const application = await storage.submitDriverApplication(req.user.id);
      await storage.createNotification({
        userId: req.user.id,
        type: "driver_mode",
        title: "Application Submitted",
        message: "Your driver application is under review. We'll notify you once approved.",
        isRead: false,
      });
      res.json(application);
    } catch {
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  app.get('/api/driver/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = await storage.getUser(req.user.id);
      const application = await storage.getDriverApplication(req.user.id);
      res.json({
        isDriver: user?.isDriver || false,
        isActive: user?.isActive || false,
        driverVerified: user?.driverVerified || false,
        vehicleMake: user?.vehicleMake || null,
        vehicleModel: user?.vehicleModel || null,
        vehicleColor: user?.vehicleColor || null,
        licensePlate: user?.licensePlate || null,
        agreedToTerms: user?.agreedToTerms || false,
        applicationStatus: application?.status || null,
      });
    } catch {
      res.status(500).json({ message: "Failed to get driver status" });
    }
  });

  app.post('/api/driver/active', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { active } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ message: "Invalid request" });

    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isDriver) return res.status(403).json({ message: "Not a registered driver" });
      if (!user?.driverVerified && active) return res.status(403).json({ message: "Driver not verified yet" });
      if (user?.isDisabled) return res.status(403).json({ message: "Account disabled" });

      const updated = await storage.setDriverActive(req.user.id, active);

      if (active) {
        liveLocations.set(req.user.id, {
          latitude: 38.0406,
          longitude: -84.5037,
          accuracy: 10,
          updatedAt: Date.now(),
        });
      } else {
        liveLocations.delete(req.user.id);
      }

      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to toggle active status" });
    }
  });

  app.get('/api/hops/:id/driver-info', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hops = await storage.getHopsForWalker(req.user.id);
      const hop = hops.find(h => h.id === hopId && h.status === 'matched');
      if (!hop || !hop.driverId) return res.json(null);
      const driver = await storage.getUser(hop.driverId);
      if (!driver) return res.json(null);
      res.json({
        username: driver.username,
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        vehicleColor: driver.vehicleColor,
        licensePlate: driver.licensePlate,
      });
    } catch {
      res.status(500).json({ message: "Failed to get driver info" });
    }
  });

  // Driver decline hop
  app.post('/api/hops/:id/decline', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      res.json({ message: "Declined", hopId });
    } catch {
      res.status(500).json({ message: "Failed to decline" });
    }
  });

  // Admin Routes
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user?.isAdmin) return res.status(403).json({ message: "Admin access required" });
    next();
  };

  app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const activeDrivers = await storage.getActiveDrivers();
      const applications = await storage.getDriverApplications();
      const pendingApps = applications.filter(a => a.status === "pending");
      const availableHops = await storage.getAvailableHops();
      const logs = await storage.getSystemLogs(10);

      res.json({
        totalUsers: allUsers.length,
        totalDrivers: allUsers.filter(u => u.isDriver).length,
        activeDrivers: activeDrivers.length,
        verifiedDrivers: allUsers.filter(u => u.driverVerified).length,
        pendingApplications: pendingApps.length,
        activeHopRequests: availableHops.length,
        recentRides: logs.length,
      });
    } catch {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(u => ({
        id: u.id,
        username: u.username,
        isDriver: u.isDriver,
        isActive: u.isActive,
        driverVerified: u.driverVerified,
        isDisabled: u.isDisabled,
        isAdmin: u.isAdmin,
        isFounder: u.isFounder,
        credits: u.credits,
        totalHops: u.totalHops,
        vehicleMake: u.vehicleMake,
        vehicleModel: u.vehicleModel,
        vehicleColor: u.vehicleColor,
        licensePlate: u.licensePlate,
        createdAt: u.createdAt,
      })));
    } catch {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get('/api/admin/drivers', requireAdmin, async (_req, res) => {
    try {
      const activeDrivers = await storage.getActiveDrivers();
      res.json(activeDrivers.map(d => ({
        id: d.id,
        username: d.username,
        isActive: d.isActive,
        driverVerified: d.driverVerified,
        vehicleMake: d.vehicleMake,
        vehicleModel: d.vehicleModel,
        vehicleColor: d.vehicleColor,
        licensePlate: d.licensePlate,
        credits: d.credits,
      })));
    } catch {
      res.status(500).json({ message: "Failed to get drivers" });
    }
  });

  app.get('/api/admin/applications', requireAdmin, async (_req, res) => {
    try {
      const applications = await storage.getDriverApplications();
      res.json(applications);
    } catch {
      res.status(500).json({ message: "Failed to get applications" });
    }
  });

  app.post('/api/admin/applications/:id/review', requireAdmin, async (req, res) => {
    try {
      const appId = Number(req.params.id);
      const { status, notes } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be approved or rejected" });
      }
      const application = await storage.reviewDriverApplication(appId, status, req.user.id, notes);

      const notifTitle = status === "approved" ? "Driver Approved! 🎉" : "Application Update";
      const notifMsg = status === "approved"
        ? "Your driver application has been approved! You can now go active and accept hop requests."
        : `Your driver application was not approved. ${notes || "Please contact support for more info."}`;

      await storage.createNotification({
        userId: application.userId,
        type: "driver_mode",
        title: notifTitle,
        message: notifMsg,
        isRead: false,
      });

      res.json(application);
    } catch {
      res.status(500).json({ message: "Failed to review application" });
    }
  });

  app.post('/api/admin/users/:id/disable', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { disabled } = req.body;
      const user = await storage.disableUser(userId, disabled);
      res.json(user);
    } catch {
      res.status(500).json({ message: "Failed to disable user" });
    }
  });

  app.get('/api/admin/logs', requireAdmin, async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const logs = await storage.getSystemLogs(limit);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Failed to get logs" });
    }
  });

  app.post('/api/admin/notify-drivers', requireAdmin, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const activeDrivers = await storage.getActiveDrivers();
      const allDrivers = (await storage.getAllUsers()).filter(u => u.isDriver);
      const targets = activeDrivers.length > 0 ? activeDrivers : allDrivers;

      for (const driver of targets) {
        await storage.createNotification({
          userId: driver.id,
          type: "hop_nearby",
          title: "HOP REQUEST NEAR YOU",
          message,
          isRead: false,
        });
      }
      res.json({ sent: targets.length });
    } catch {
      res.status(500).json({ message: "Failed to notify drivers" });
    }
  });

  // Expansion
  app.get(api.expansion.checkCity.path, (req, res) => {
    const city = (req.query.city as string || "").trim().toLowerCase();
    const available = LAUNCH_CITIES_AUTH.some(c => city.includes(c));
    res.json({ available, city: req.query.city as string });
  });

  app.post(api.expansion.joinWaitlist.path, async (req, res) => {
    try {
      const { username, city, phone } = req.body;
      if (!username || !city || !phone) {
        return res.status(400).json({ message: "All fields are required" });
      }
      await storage.addToExpansionWaitlist({ username, city, phone, notified: false });
      res.status(201).json({ message: "You're on the list! We'll notify you when ShortHop launches in your city." });
    } catch (err) {
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  return httpServer;
}
