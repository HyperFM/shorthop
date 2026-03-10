import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev_secret',
      resave: false,
      saveUninitialized: false,
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
      const { username, password, isDriver, city } = req.body;
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
      let user = await storage.createUser({ username, password, isDriver: !!isDriver, city: city?.trim() || null });
      user = await storage.checkAndAssignFounderStatus(user.id, !!user.isDriver);

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
      const hops = await storage.getAvailableHops();
      res.json(hops);
    } else {
      const hops = await storage.getHopsForWalker(req.user.id);
      res.json(hops);
    }
  });

  app.post(api.hops.requestMovement.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.hops.requestMovement.input.parse(req.body);
      
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
       const hop = await storage.completeHop(Number(req.params.id), input.distanceMiles);
       res.json(hop);
    } catch (e) {
       res.status(404).json({ message: "Hop not found" });
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
