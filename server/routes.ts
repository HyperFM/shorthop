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
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const existing = await storage.getUserByUsername(req.body.username);
      if (existing) {
        return res.status(400).json({ message: "Username exists" });
      }
      const user = await storage.createUser(req.body);
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
      
      // Calculate pricing based on hop type
      let priceCents = 0;
      if (input.hopType === "short_hop") {
        priceCents = Math.floor((parseFloat(input.distanceMiles || "1") * 150)); // $1.50 per mile
      } else if (input.hopType === "flex_hop") {
        priceCents = Math.floor((parseFloat(input.distanceMiles || "1") * 200)); // $2.00 per mile
      } else if (input.hopType === "full_ride") {
        priceCents = Math.floor((parseFloat(input.distanceMiles || "5") * 150)); // $1.50 per mile base
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

  return httpServer;
}