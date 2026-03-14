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
import { getUncachableStripeClient } from "./stripeClient";
import { translateText, getLanguages } from "./translate";

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

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

interface CorridorSegment {
  name: string;
  corridorType: string;
  points: [number, number][];
  trafficFlows: string[];
}

const LEXINGTON_CORRIDORS: CorridorSegment[] = [
  {
    name: "Nicholasville Rd",
    corridorType: "4-lane highway",
    points: [[38.0496, -84.5044], [38.0350, -84.5060], [38.0200, -84.5070], [38.0050, -84.5090], [37.9900, -84.5150]],
    trafficFlows: ["north toward downtown", "south toward Jessamine Co"],
  },
  {
    name: "Richmond Rd (US-25)",
    corridorType: "busy highway",
    points: [[38.0450, -84.4880], [38.0350, -84.4800], [38.0250, -84.4730], [38.0150, -84.4660]],
    trafficFlows: ["northwest toward downtown", "southeast toward Richmond"],
  },
  {
    name: "New Circle Rd (KY-4)",
    corridorType: "highway loop",
    points: [[38.0700, -84.5300], [38.0700, -84.5100], [38.0650, -84.4900], [38.0500, -84.4700], [38.0300, -84.4650], [38.0100, -84.4800], [38.0000, -84.4950], [37.9950, -84.5150], [38.0050, -84.5350], [38.0250, -84.5450], [38.0450, -84.5400], [38.0600, -84.5350]],
    trafficFlows: ["clockwise (outer lanes)", "counter-clockwise (inner lanes)"],
  },
  {
    name: "Man o' War Blvd (KY-922)",
    corridorType: "6-lane boulevard",
    points: [[37.9880, -84.5500], [37.9870, -84.5300], [37.9850, -84.5100], [37.9840, -84.4900], [37.9830, -84.4700], [37.9820, -84.4500]],
    trafficFlows: ["east toward I-75", "west toward Versailles Rd"],
  },
  {
    name: "Tates Creek Rd",
    corridorType: "4-lane road",
    points: [[38.0380, -84.4960], [38.0280, -84.4930], [38.0180, -84.4920], [38.0050, -84.4930]],
    trafficFlows: ["north toward campus", "south toward Man o' War"],
  },
  {
    name: "Versailles Rd (US-60)",
    corridorType: "4-lane highway",
    points: [[38.0500, -84.5050], [38.0510, -84.5200], [38.0520, -84.5350], [38.0530, -84.5500]],
    trafficFlows: ["east toward downtown", "west toward Versailles"],
  },
  {
    name: "Harrodsburg Rd (US-68)",
    corridorType: "4-lane road",
    points: [[38.0480, -84.5050], [38.0350, -84.5150], [38.0220, -84.5250], [38.0100, -84.5350]],
    trafficFlows: ["northeast toward downtown", "southwest toward Harrodsburg"],
  },
  {
    name: "Winchester Rd (US-60)",
    corridorType: "4-lane highway",
    points: [[38.0500, -84.4900], [38.0550, -84.4750], [38.0580, -84.4600], [38.0600, -84.4500]],
    trafficFlows: ["west toward downtown", "east toward Winchester / I-64"],
  },
  {
    name: "Leestown Rd (US-421)",
    corridorType: "4-lane road",
    points: [[38.0500, -84.5080], [38.0580, -84.5120], [38.0660, -84.5170], [38.0750, -84.5200]],
    trafficFlows: ["south toward downtown", "north toward Georgetown"],
  },
  {
    name: "Broadway (US-68)",
    corridorType: "2-lane urban road",
    points: [[38.0496, -84.5000], [38.0496, -84.5100], [38.0496, -84.5200]],
    trafficFlows: ["east toward downtown", "west toward Leestown"],
  },
  {
    name: "Main St",
    corridorType: "one-way downtown",
    points: [[38.0500, -84.4950], [38.0500, -84.5000], [38.0500, -84.5050]],
    trafficFlows: ["westbound through downtown"],
  },
  {
    name: "Limestone (US-27)",
    corridorType: "4-lane road",
    points: [[38.0500, -84.5030], [38.0420, -84.5040], [38.0350, -84.5050], [38.0280, -84.5060]],
    trafficFlows: ["north toward downtown", "south toward Southland Dr"],
  },
  {
    name: "Alumni Dr / Cooper Dr",
    corridorType: "campus road",
    points: [[38.0320, -84.5060], [38.0330, -84.5000], [38.0340, -84.4950]],
    trafficFlows: ["east toward Rose St", "west toward Nicholasville"],
  },
  {
    name: "Clays Mill Rd",
    corridorType: "2-lane collector",
    points: [[38.0200, -84.5400], [38.0100, -84.5380], [38.0000, -84.5350]],
    trafficFlows: ["north toward Harrodsburg Rd", "south toward Man o' War"],
  },
  {
    name: "Liberty Rd / Athens-Boonesboro",
    corridorType: "2-lane highway",
    points: [[38.0300, -84.4650], [38.0200, -84.4550], [38.0100, -84.4450]],
    trafficFlows: ["northwest toward town", "southeast toward I-75"],
  },
];

function closestPointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return [ax, ay];
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return [ax + t * dx, ay + t * dy];
}

function findNearestCorridorPoint(lat: number, lng: number): { corridor: CorridorSegment; nearLat: number; nearLng: number; dist: number }[] {
  const results: { corridor: CorridorSegment; nearLat: number; nearLng: number; dist: number }[] = [];

  for (const corridor of LEXINGTON_CORRIDORS) {
    let bestDist = Infinity;
    let bestLat = corridor.points[0][0];
    let bestLng = corridor.points[0][1];

    for (let i = 0; i < corridor.points.length - 1; i++) {
      const [a0, a1] = corridor.points[i];
      const [b0, b1] = corridor.points[i + 1];
      const [cLat, cLng] = closestPointOnSegment(lat, lng, a0, a1, b0, b1);
      const d = getDistance(lat, lng, cLat, cLng);
      if (d < bestDist) {
        bestDist = d;
        bestLat = cLat;
        bestLng = cLng;
      }
    }

    results.push({ corridor, nearLat: bestLat, nearLng: bestLng, dist: bestDist });
  }

  return results.sort((a, b) => a.dist - b.dist);
}

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
      rolling: true,
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
      const { username, password, isDriver, city, referralCode: refCode, referredBy: refBy, phone, notificationsEnabled } = req.body;
      const referralInput = refCode || refBy || null;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ message: "Phone number is required" });
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
        phone: phone?.trim() || null,
        notificationsEnabled: !!notificationsEnabled,
        referralCode: userReferralCode,
        referredBy: referralInput || null,
      });

      const allUsers = await storage.getAllUsers();
      const maxNum = allUsers.reduce((max, u) => Math.max(max, u.signupNumber || 0), 0);
      const nextSignupNumber = maxNum + 1;
      const isPioneer = nextSignupNumber <= 5;
      user = await storage.updateUser(user.id, {
        signupNumber: nextSignupNumber,
        isRoutePioneer: isPioneer,
      });

      user = await storage.checkAndAssignFounderStatus(user.id, !!user.isDriver);

      if (referralInput) {
        await storage.processReferral(user.id, referralInput);
      }

      if (isPioneer) {
        await storage.createNotification({
          userId: user.id,
          type: "welcome",
          title: "👑 Welcome, Pioneer!",
          message: `You are one of the first riders to join ShortHop.\nIt takes intuition and courage to try something new, and your early belief helps shape the future of shared rides.\n\nTo honor the trust of our first riders, I'll be out every morning promoting ShortHop and growing the community one rider at a time.\n\nThank you for being part of the beginning.\n\n— Hyper ❤️`,
          isRead: false,
        });
      }

      await storage.createNotification({
        userId: user.id,
        type: "welcome",
        title: "Welcome to ShortHop! 🛞",
        message: "Hello! It was nice seeing you earlier — welcome aboard! You're one of the early people helping bring ShortHop to life in Lexington. We're still growing, so if you know anyone who could use a ride or wants to help others get around, share the app with them. Every person makes this community stronger!",
        isRead: false,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitizeUser(user));
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), async (req, res) => {
    if (req.user && req.user.username.toLowerCase() === "hyperfm" && !req.user.isAdmin) {
      await storage.setAdmin(req.user.id, true);
      req.user.isAdmin = true;
    }
    const rememberMe = req.body.rememberMe === true || req.body.rememberMe === "true";
    if (rememberMe) {
      req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000;
    } else {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      res.status(200).json(sanitizeUser(req.user));
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      res.status(200).json(sanitizeUser(req.user));
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

      const driverLoc = liveLocations.get(req.user.id);
      const driverRoutes = await storage.getRoutes(req.user.id);
      let sortedAvailable = availableHops;
      if (driverLoc && Date.now() - driverLoc.updatedAt < 120000) {
        const driverDestinations = driverRoutes.map(r => ({
          start: r.startLocation?.toLowerCase() || "",
          end: r.destination?.toLowerCase() || "",
        }));

        function scoreHop(hop: typeof availableHops[0]): number {
          const hopStartLat = parseFloat(hop.startLat || "0");
          const hopStartLng = parseFloat(hop.startLng || "0");
          if (!hopStartLat) return 999;

          const pickupDist = getDistance(driverLoc!.latitude, driverLoc!.longitude, hopStartLat, hopStartLng);

          let directionBonus = 0;
          const hopDest = (hop.endLocation || "").toLowerCase();
          const hopStart = (hop.startLocation || "").toLowerCase();
          for (const route of driverDestinations) {
            if (route.end && hopDest && (route.end.includes(hopDest) || hopDest.includes(route.end))) {
              directionBonus = -5;
              break;
            }
            if (route.start && hopStart && (route.start.includes(hopStart) || hopStart.includes(route.start))) {
              directionBonus = Math.min(directionBonus, -2);
            }
          }

          const hopEndLat = parseFloat(hop.endLat || "0");
          const hopEndLng = parseFloat(hop.endLng || "0");
          if (hopEndLat && hopEndLng) {
            for (const route of driverDestinations) {
              for (const corridor of LEXINGTON_CORRIDORS) {
                const cNameLower = corridor.name.toLowerCase();
                if (route.end.includes(cNameLower) || hopDest.includes(cNameLower)) {
                  directionBonus = Math.min(directionBonus, -3);
                }
              }
            }
          }

          return pickupDist + directionBonus;
        }

        sortedAvailable = [...availableHops].sort((a, b) => scoreHop(a) - scoreHop(b));
      }

      const mergedHops = [
        ...sortedAvailable,
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
      const miles = parseFloat(input.distanceMiles || "1");
      if (input.hopType === "short_hop") {
        priceCents = Math.floor(miles * 300);
      } else if (input.hopType === "flex_hop") {
        priceCents = Math.floor(miles * 300);
      } else if (input.hopType === "full_ride") {
        priceCents = Math.floor(parseFloat(input.distanceMiles || "5") * 300);
      }

      const payWithWheels = req.body.payWithWheels === true;
      if (payWithWheels) {
        const wheelsNeeded = Math.max(1, Math.ceil(priceCents / 100));
        if (currentUser.credits < wheelsNeeded) {
          return res.status(400).json({ message: `Not enough Wheels. You need ${wheelsNeeded} but have ${currentUser.credits}.` });
        }
        await storage.deductCredits(currentUser.id, wheelsNeeded);
        priceCents = 0;
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
        detourDistance: null,
        startLat: input.startLat || null,
        startLng: input.startLng || null,
        endLat: input.endLat || null,
        endLng: input.endLng || null,
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
       const targetHop = existingHops.find(h => h.id === Number(req.params.id) && (h.status === "matched" || h.status === "in_ride"));
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

  app.post('/api/hops/:id/tip', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const tipCents = Number(req.body.tipCents);
      if (!tipCents || tipCents < 50 || tipCents > 5000) {
        return res.status(400).json({ message: "Tip must be between $0.50 and $50" });
      }
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id) return res.status(403).json({ message: "Not your hop" });
      if (hop.status !== "completed") return res.status(400).json({ message: "Hop not completed" });

      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'Driver Tip' },
            unit_amount: tipCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: { userId: String(req.user.id), type: 'tip', hopId: String(hopId), driverId: String(hop.driverId), tipCents: String(tipCents) },
        success_url: `https://${domain}/dashboard?tip=success`,
        cancel_url: `https://${domain}/dashboard?tip=cancelled`,
      });
      res.json({ url: checkoutSession.url, checkoutRequired: true });
    } catch (e: any) {
      console.error('Tip checkout error:', e.message);
      res.status(500).json({ message: "Failed to send tip" });
    }
  });

  app.post('/api/donate', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const amountCents = Number(req.body.amountCents);
      const message = (req.body.message || "").trim();
      if (!amountCents || amountCents < 50) {
        return res.status(400).json({ message: "Minimum donation is $0.50" });
      }
      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'ShortHop Donation' },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: { userId: String(req.user.id), type: 'donation', message: message || '', amountCents: String(amountCents) },
        success_url: `https://${domain}/community?donation=success`,
        cancel_url: `https://${domain}/community?donation=cancelled`,
      });
      res.json({ url: checkoutSession.url, checkoutRequired: true });
    } catch (e: any) {
      console.error('Donation checkout error:', e.message);
      res.status(500).json({ message: "Failed to process donation" });
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

  // Friends
  app.post("/api/friends/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const addresseeId = Number(req.body.addresseeId);
    if (!addresseeId || isNaN(addresseeId) || addresseeId === req.user.id) return res.status(400).json({ message: "Invalid request" });
    try {
      const result = await storage.sendFriendRequest(req.user.id, addresseeId);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/friends/respond/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const accept = req.body.accept === true;
    try {
      const result = await storage.respondFriendRequest(Number(req.params.id), req.user.id, accept);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/friends/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const requests = await storage.getFriendRequests(req.user.id);
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch friend requests" });
    }
  });

  app.get("/api/friends", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const friends = await storage.getFriends(req.user.id);
      res.json(friends);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  app.get("/api/friends/count", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const count = await storage.getFriendCount(req.user.id);
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch friend count" });
    }
  });

  app.get("/api/friends/status/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const status = await storage.getFriendshipStatus(req.user.id, Number(req.params.userId));
      res.json({ status });
    } catch (err) {
      res.status(500).json({ message: "Failed to check friendship status" });
    }
  });

  app.get("/api/community/profiles", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const profiles = await storage.getPublicProfiles(req.user.id);
      res.json(profiles);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch profiles" });
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

  app.patch('/api/user/profile', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const SUPPORTED_LANGUAGES = Object.keys(getLanguages());
      const allowed = ['driverConvoComfort', 'driverMusicPref', 'driverPetsOk', 'driverGroceriesOk', 'driverLifestyleTags', 'driverQuestionnaireCompleted', 'bio', 'interests', 'language', 'preferredRoutes', 'travelTime', 'favoritePlaces', 'profilePhoto', 'profileVisibility'];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (updates.language && !SUPPORTED_LANGUAGES.includes(updates.language)) {
        updates.language = "en";
      }
      if (updates.profileVisibility && !["public", "semi_private", "private"].includes(updates.profileVisibility)) {
        updates.profileVisibility = "public";
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No valid fields" });
      const user = await storage.updateUser(req.user.id, updates);
      res.json(sanitizeUser(user));
    } catch {
      res.status(500).json({ message: "Failed to update profile" });
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

  // Subscription via Stripe Checkout
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
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.isFounder && currentUser?.lifetimeSubscription) {
        await storage.updateUser(req.user.id, {
          subscription: plan,
          subscriptionStartDate: new Date(),
        });
        return res.json({ checkoutRequired: false, founderFree: true });
      }

      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const priceMap: Record<string, number> = { flex_hop: 1000, power_hop: 2500 };
      const nameMap: Record<string, string> = { flex_hop: "Flex Hop", power_hop: "Power Hop" };
      const amountCents = priceMap[plan];
      if (!amountCents) return res.status(400).json({ message: "Invalid plan" });

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `${nameMap[plan]} Subscription` },
            unit_amount: amountCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        metadata: { userId: String(req.user.id), plan, type: 'subscription' },
        success_url: `https://${domain}/dashboard?subscription=success&plan=${plan}`,
        cancel_url: `https://${domain}/dashboard?subscription=cancelled`,
      });
      res.json({ url: checkoutSession.url, checkoutRequired: true });
    } catch (err: any) {
      console.error('Subscription checkout error:', err.message);
      res.status(500).json({ message: "Failed to start subscription" });
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
      const fallback = LEXINGTON_CORRIDORS.slice(0, 3).map(c => ({
        name: c.name,
        desc: `${c.corridorType} — traffic flows ${c.trafficFlows.join(' / ')}`,
        lat: c.points[0][0],
        lng: c.points[0][1],
        trafficFlow: c.trafficFlows.join(' or '),
        corridorType: c.corridorType,
      }));
      return res.json({ spots: fallback });
    }

    const nearest = findNearestCorridorPoint(lat, lng).slice(0, 5);

    const spots = nearest.map(n => ({
      name: n.corridor.name,
      desc: `${n.corridor.corridorType} — walk to the road, stand on the side heading your direction`,
      lat: n.nearLat,
      lng: n.nearLng,
      distance: n.dist,
      trafficFlow: n.corridor.trafficFlows.join(' or '),
      corridorType: n.corridor.corridorType,
    }));

    res.json({ spots });
  });

  app.get('/api/schedules', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userSchedules = await storage.getUserSchedules(req.user.id);
      res.json(userSchedules);
    } catch {
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { days, startLocation, destination, timeStart, timeEnd, returnTrip } = req.body;
      if (!days || !startLocation || !destination || !timeStart || !timeEnd) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const schedule = await storage.createSchedule({
        userId: req.user.id,
        days,
        startLocation,
        destination,
        timeStart,
        timeEnd,
        returnTrip: returnTrip || false,
        active: true,
      });
      res.json(schedule);
    } catch {
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  app.patch('/api/schedules/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { days, startLocation, destination, timeStart, timeEnd, returnTrip, active } = req.body;
      const updates: Record<string, any> = {};
      if (days !== undefined) updates.days = days;
      if (startLocation !== undefined) updates.startLocation = startLocation;
      if (destination !== undefined) updates.destination = destination;
      if (timeStart !== undefined) updates.timeStart = timeStart;
      if (timeEnd !== undefined) updates.timeEnd = timeEnd;
      if (returnTrip !== undefined) updates.returnTrip = returnTrip;
      if (active !== undefined) updates.active = active;
      const schedule = await storage.updateSchedule(parseInt(req.params.id), req.user.id, updates);
      if (!schedule) return res.status(404).json({ message: "Schedule not found" });
      res.json(schedule);
    } catch {
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  app.delete('/api/schedules/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.deleteSchedule(parseInt(req.params.id), req.user.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  app.get('/api/smart-matches', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const now = new Date();
      const today = dayNames[now.getDay()];
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const completedHops = await storage.getUserCompletedHopCount(req.user.id);
      const mySchedules = await storage.getUserSchedules(req.user.id);
      const activeToday = mySchedules.filter(s =>
        s.active && (s.days as string[]).includes(today)
      );

      if (activeToday.length === 0) {
        return res.json({ matches: [], firstHopAssist: completedHops === 0 && mySchedules.length > 0, completedHops });
      }
      const allSchedulesToday = await storage.getAllActiveSchedulesForDay(today);

      const matches: { scheduleId: number; username: string; corridor: string | null; direction: string; timeWindow: string; matchType: string }[] = [];

      for (const mine of activeToday) {
        for (const other of allSchedulesToday) {
          if (other.userId === req.user.id) continue;
          const otherStart = parseInt(other.timeStart.replace(':', ''));
          const otherEnd = parseInt(other.timeEnd.replace(':', ''));
          const myStart = parseInt(mine.timeStart.replace(':', ''));
          const myEnd = parseInt(mine.timeEnd.replace(':', ''));
          if (otherStart > myEnd || otherEnd < myStart) continue;

          const startLower = mine.startLocation.toLowerCase();
          const destLower = mine.destination.toLowerCase();
          const otherStartLower = other.startLocation.toLowerCase();
          const otherDestLower = other.destination.toLowerCase();
          const sameDirection = (startLower === otherStartLower && destLower === otherDestLower) ||
            destLower === otherDestLower ||
            startLower === otherStartLower;

          if (sameDirection) {
            let corridor: string | null = mine.corridor || other.corridor || null;
            let nearestCorridor = null;
            if (!corridor) {
              for (const c of LEXINGTON_CORRIDORS) {
                const nameLower = c.name.toLowerCase();
                if (destLower.includes(nameLower) || startLower.includes(nameLower) ||
                    otherDestLower.includes(nameLower) || otherStartLower.includes(nameLower)) {
                  nearestCorridor = c;
                  break;
                }
              }
              if (nearestCorridor) corridor = nearestCorridor.name;
            }

            matches.push({
              scheduleId: other.id,
              username: other.username,
              corridor,
              direction: `${other.startLocation} → ${other.destination}`,
              timeWindow: `${other.timeStart} - ${other.timeEnd}`,
              matchType: completedHops === 0 ? "first_hop_assist" : "schedule_match",
            });
          }
        }
      }

      res.json({
        matches: matches.slice(0, 5),
        firstHopAssist: completedHops === 0,
        completedHops,
      });
    } catch (err) {
      console.error("Smart match error:", err);
      res.status(500).json({ message: "Failed to find matches" });
    }
  });

  app.post('/api/hops/:id/start-ride', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "matched") return res.status(400).json({ message: "Hop must be in matched state to start ride" });
      if (hop.walkerId !== req.user.id && hop.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not your hop" });
      }
      const updated = await storage.startRide(hopId);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to start ride" });
    }
  });

  app.post('/api/hops/:id/auto-complete', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "in_ride") return res.status(400).json({ message: "Hop must be in_ride to auto-complete" });
      if (hop.walkerId !== req.user.id && hop.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not your hop" });
      }
      const distanceMiles = hop.distanceMiles || "1";
      const completed = await storage.completeHop(hopId, distanceMiles);

      if (hop.walkerId) {
        const walkerStreak = await storage.updateHopStreak(hop.walkerId);
        for (const badge of walkerStreak.newBadges) {
          const todayCount = await storage.getNotificationCountToday(hop.walkerId);
          if (todayCount < 5) {
            await storage.createNotification({
              userId: hop.walkerId,
              type: "badge",
              title: "New Badge Earned!",
              message: `You earned: ${badge}`,
              isRead: false,
            });
          }
        }
      }
      if (hop.driverId) {
        const driverStreak = await storage.updateHopStreak(hop.driverId);
        for (const badge of driverStreak.newBadges) {
          const todayCount = await storage.getNotificationCountToday(hop.driverId);
          if (todayCount < 5) {
            await storage.createNotification({
              userId: hop.driverId,
              type: "badge",
              title: "New Badge Earned!",
              message: `You earned: ${badge}`,
              isRead: false,
            });
          }
        }
      }

      res.json(completed);
    } catch (err) {
      res.status(500).json({ message: "Failed to auto-complete ride" });
    }
  });

  app.get('/api/hop-stats', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const completedHops = await storage.getUserCompletedHopCount(req.user.id);
      res.json({ completedHops });
    } catch {
      res.status(500).json({ message: "Failed to get hop stats" });
    }
  });

  // Driver Onboarding & Profile
  app.post('/api/upload-driver-image', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json({ url: `data:image/placeholder;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==` });
  });

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
        driverConvoComfort: driver.driverConvoComfort,
        driverMusicPref: driver.driverMusicPref,
        driverPetsOk: driver.driverPetsOk,
        driverGroceriesOk: driver.driverGroceriesOk,
        driverLifestyleTags: driver.driverLifestyleTags,
        driverQuestionnaireCompleted: driver.driverQuestionnaireCompleted,
        rideVibe: driver.rideVibe,
        bio: driver.bio,
        interests: driver.interests,
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
        phone: u.phone,
        notificationsEnabled: u.notificationsEnabled,
        signupNumber: u.signupNumber,
        isRoutePioneer: u.isRoutePioneer,
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

  app.post('/api/admin/notify-all', requireAdmin, async (req, res) => {
    try {
      const { title, message } = req.body;
      if (!title || !message) return res.status(400).json({ message: "Title and message required" });
      const allUsers = await storage.getAllUsers();
      let sent = 0;
      for (const u of allUsers) {
        if (u.isAdmin) continue;
        await storage.createNotification({
          userId: u.id,
          type: "general",
          title,
          message,
          isRead: false,
        });
        sent++;
      }
      res.json({ sent });
    } catch {
      res.status(500).json({ message: "Failed to notify users" });
    }
  });

  app.post('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.isAdmin) return res.status(403).json({ message: "Cannot block admin" });
      const { phone, deviceId, reason } = req.body;
      await storage.disableUser(userId, true);
      res.json({ message: "User blocked", userId, phone: phone || null, deviceId: deviceId || null, reason: reason || "Blocked by admin" });
    } catch {
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  app.post('/api/admin/users/:id/delete', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const targetUser = await storage.getUser(userId);
      if (targetUser?.isAdmin) return res.status(403).json({ message: "Cannot delete admin account" });
      await storage.deleteUser(userId);
      res.json({ message: "User deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post('/api/admin/users/:id/grant-wheels', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const amount = Number(req.body.amount);
      if (!amount || amount < 1 || amount > 1000) {
        return res.status(400).json({ message: "Amount must be between 1 and 1000" });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      await storage.addCredits(userId, amount);
      await storage.createNotification({
        userId,
        type: "reward",
        title: "You received Wheels! 🛞",
        message: `The ShortHop team gifted you ${amount} Wheel${amount !== 1 ? 's' : ''}. Check your Rewards page!`,
      });
      res.json({ message: `Granted ${amount} Wheels to ${targetUser.username}`, newBalance: (targetUser.credits || 0) + amount });
    } catch {
      res.status(500).json({ message: "Failed to grant wheels" });
    }
  });

  app.patch('/api/admin/my-tier', requireAdmin, async (req, res) => {
    try {
      const { subscription } = req.body;
      const validTiers = [null, "flex_hop", "power_hop"];
      if (!validTiers.includes(subscription)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      await storage.updateUser(req.user!.id, { subscription });
      res.json({ message: "Tier updated", subscription });
    } catch {
      res.status(500).json({ message: "Failed to update tier" });
    }
  });

  app.get('/api/admin/inbox', requireAdmin, async (_req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post('/api/admin/inbox/:id/reply', requireAdmin, async (req, res) => {
    try {
      const { reply } = req.body;
      if (!reply) return res.status(400).json({ message: "Reply required" });
      const msg = await storage.replyToContactMessage(Number(req.params.id), reply);
      const targetUser = await storage.getUser(msg.userId);
      const targetLang = targetUser?.language || "en";
      let replyText = reply;
      if (targetLang !== "en") {
        const translated = await translateText(reply, "en", targetLang);
        replyText = `${reply}\n\n🌐 [${targetLang}]: ${translated}`;
      }
      await storage.createNotification({
        userId: msg.userId,
        type: "general",
        title: "Reply from ShortHop",
        message: replyText,
        isRead: false,
      });
      res.json(msg);
    } catch {
      res.status(500).json({ message: "Failed to reply" });
    }
  });

  app.get('/api/admin/reports', requireAdmin, async (_req, res) => {
    try {
      const allReports = await storage.getReports();
      res.json(allReports);
    } catch {
      res.status(500).json({ message: "Failed to get reports" });
    }
  });

  app.post('/api/admin/reports/:id/resolve', requireAdmin, async (req, res) => {
    try {
      const { notes } = req.body;
      const report = await storage.resolveReport(Number(req.params.id), notes || "Resolved");
      res.json(report);
    } catch {
      res.status(500).json({ message: "Failed to resolve report" });
    }
  });

  // User-facing contact & report
  app.post('/api/contact', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { subject, message, category } = req.body;
      if (!subject || !message) return res.status(400).json({ message: "Subject and message required" });
      const msg = await storage.createContactMessage({
        userId: req.user.id,
        subject,
        message,
        category: category || "general",
      });
      res.json(msg);
    } catch {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/contact', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const allMsgs = await storage.getContactMessages();
      const userMsgs = allMsgs.filter(m => m.userId === req.user.id);
      res.json(userMsgs);
    } catch {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post('/api/report', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { category, description, reportedUserId } = req.body;
      if (!category || !description) return res.status(400).json({ message: "Category and description required" });
      const report = await storage.createReport({
        userId: req.user.id,
        category,
        description,
        reportedUserId: reportedUserId || null,
      });
      res.json(report);
    } catch {
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // Widget data API
  let weatherCache: { data: any; timestamp: number } | null = null;
  const WEATHER_CACHE_MS = 15 * 60 * 1000;

  app.get('/api/weather', async (_req, res) => {
    try {
      if (weatherCache && Date.now() - weatherCache.timestamp < WEATHER_CACHE_MS) {
        return res.json(weatherCache.data);
      }
      const response = await fetch('https://wttr.in/Lexington+KY?format=j1');
      if (!response.ok) throw new Error("Weather fetch failed");
      const raw = await response.json();
      const current = raw.current_condition?.[0];
      if (!current) throw new Error("No weather data");
      const code = parseInt(current.weatherCode || "0");
      let condition: "clear" | "cloudy" | "rain" | "snow" | "storm" | "fog" = "clear";
      if ([200, 201, 202, 230, 231, 232, 386, 389, 392, 395].includes(code)) condition = "storm";
      else if ([600, 601, 602, 611, 612, 615, 616, 620, 621, 622, 179, 227, 230, 323, 326, 329, 332, 335, 338, 368, 371].includes(code)) condition = "snow";
      else if ([300, 301, 302, 310, 311, 312, 313, 314, 321, 500, 501, 502, 503, 504, 511, 520, 521, 522, 531, 176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359, 362, 365].includes(code)) condition = "rain";
      else if ([741, 248, 260].includes(code)) condition = "fog";
      else if ([801, 802, 803, 804, 119, 122].includes(code)) condition = "cloudy";
      const data = {
        temp: parseInt(current.temp_F || "0"),
        feelsLike: parseInt(current.FeelsLikeF || "0"),
        condition,
        description: current.weatherDesc?.[0]?.value || "Unknown",
        humidity: parseInt(current.humidity || "0"),
        windMph: parseInt(current.windspeedMiles || "0"),
        weatherCode: code,
      };
      weatherCache = { data, timestamp: Date.now() };
      res.json(data);
    } catch {
      res.json({ temp: 70, feelsLike: 70, condition: "clear", description: "Clear", humidity: 50, windMph: 5, weatherCode: 0 });
    }
  });

  app.get('/api/widget/data', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const data = await storage.getWidgetData(req.user.id);
      res.json(data);
    } catch {
      res.status(500).json({ message: "Failed to get widget data" });
    }
  });

  // Founder chat
  app.get('/api/founder-chat', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user?.isFounder && !user?.isAdmin) return res.status(403).json({ message: "Founders only" });
    try {
      const messages = await storage.getFounderMessages();
      res.json(messages);
    } catch {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post('/api/founder-chat', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user?.isFounder && !user?.isAdmin) return res.status(403).json({ message: "Founders only" });
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const userLang = user.language || "en";
      let storedMessage = message;
      if (userLang !== "en") {
        const translated = await translateText(message, userLang, "en");
        storedMessage = `${message}\n\n🌐 [EN]: ${translated}`;
      }
      const msg = await storage.createFounderMessage({
        userId: req.user.id,
        message: storedMessage,
        isAdminReply: req.user.isAdmin || false,
      });
      if (!req.user.isAdmin) {
        const admins = (await storage.getAllUsers()).filter(u => u.isAdmin);
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "general",
            title: "Founder Chat Message",
            message: `${req.user.username}: ${message.substring(0, 100)}`,
            isRead: false,
          });
        }
      }
      res.json(msg);
    } catch {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Cashout history (all cashouts now go through Stripe)
  app.get('/api/cashouts', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const cashouts = await storage.getUserCashouts(req.user.id);
      res.json(cashouts);
    } catch {
      res.status(500).json({ message: "Failed to get cashouts" });
    }
  });

  app.get('/api/admin/redemptions', requireAdmin, async (_req, res) => {
    try {
      const redemptions = await storage.getAllRedemptions();
      res.json(redemptions);
    } catch {
      res.status(500).json({ message: "Failed to get redemptions" });
    }
  });

  // VIP Hyper Chat (DMs between founders and HyperFM)
  app.get('/api/vip-chat', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user?.isFounder) return res.status(403).json({ message: "Founders only" });
    try {
      const messages = await storage.getVipMessages(req.user.id);
      res.json(messages);
    } catch {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post('/api/vip-chat', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    if (!user?.isFounder) return res.status(403).json({ message: "Founders only" });
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const userLang = user.language || "en";
      let translatedMessage = message;
      if (userLang !== "en") {
        translatedMessage = await translateText(message, userLang, "en");
      }
      const storedMessage = userLang !== "en"
        ? `${message}\n\n🌐 [Auto-translated to English]: ${translatedMessage}`
        : message;
      const msg = await storage.createVipMessage({
        userId: req.user.id,
        message: storedMessage,
        isAdminReply: false,
      });
      const admins = (await storage.getAllUsers()).filter(u => u.isAdmin);
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "general",
          title: "VIP DM from " + user.username,
          message: translatedMessage.substring(0, 100),
          isRead: false,
        });
      }
      res.json(msg);
    } catch {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/admin/vip-conversations', requireAdmin, async (_req, res) => {
    try {
      const convos = await storage.getVipConversations();
      res.json(convos);
    } catch {
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  app.get('/api/admin/vip-chat/:userId', requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getVipMessages(Number(req.params.userId));
      res.json(messages);
    } catch {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post('/api/admin/vip-chat/:userId', requireAdmin, async (req, res) => {
    try {
      const targetUserId = Number(req.params.userId);
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const targetUser = await storage.getUser(targetUserId);
      const targetLang = targetUser?.language || "en";
      let storedMessage = message;
      if (targetLang !== "en") {
        const translated = await translateText(message, "en", targetLang);
        storedMessage = `${message}\n\n🌐 [Auto-translated to ${targetLang}]: ${translated}`;
      }
      const msg = await storage.createVipMessage({
        userId: targetUserId,
        message: storedMessage,
        isAdminReply: true,
      });
      await storage.createNotification({
        userId: targetUserId,
        type: "general",
        title: "Message from Hyper",
        message: storedMessage.substring(0, 100),
        isRead: false,
      });
      res.json(msg);
    } catch {
      res.status(500).json({ message: "Failed to send reply" });
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

  // Stripe Connect for driver cashouts
  app.post('/api/stripe/connect-onboard', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const stripe = await getUncachableStripeClient();
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      let accountId = user.stripeAccountId;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          metadata: { userId: String(user.id), username: user.username },
          settings: { payouts: { schedule: { interval: 'manual' } } },
        });
        accountId = account.id;
        await storage.updateUser(user.id, { stripeAccountId: accountId });
      }

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `https://${domain}/rewards?stripe=refresh`,
        return_url: `https://${domain}/rewards?stripe=success`,
        type: 'account_onboarding',
      });
      res.json({ url: accountLink.url });
    } catch (e: any) {
      console.error('Stripe Connect onboard error:', e.message);
      res.status(500).json({ message: "Failed to start Stripe setup" });
    }
  });

  app.get('/api/stripe/connect-status', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !user.stripeAccountId) {
        return res.json({ connected: false, payoutsEnabled: false });
      }
      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      const payoutsEnabled = account.payouts_enabled || false;

      if (payoutsEnabled !== user.stripePayoutsEnabled) {
        await storage.updateUser(user.id, { stripePayoutsEnabled: payoutsEnabled });
      }

      res.json({
        connected: true,
        payoutsEnabled,
        chargesEnabled: account.charges_enabled,
        accountId: user.stripeAccountId,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to check status" });
    }
  });

  app.post('/api/stripe/driver-cashout', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const amount = Math.floor(Number(req.body.amount));
      if (!amount || amount < 5) {
        return res.status(400).json({ message: "Minimum cashout is 5 Wheels" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.stripeAccountId) return res.status(400).json({ message: "Stripe not connected" });
      if ((user.credits || 0) < amount) {
        return res.status(400).json({ message: `Not enough Wheels. You have ${user.credits || 0}.` });
      }

      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      if (!account.payouts_enabled) {
        return res.status(400).json({ message: "Stripe account setup not complete. Please finish onboarding." });
      }

      const amountCents = amount * 100;
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: user.stripeAccountId,
        metadata: { userId: String(user.id), wheels: String(amount) },
      });

      const cashout = await storage.createCashoutAtomic(user.id, amount, "stripe", `Stripe (${user.stripeAccountId})`);

      await storage.createNotification({
        userId: user.id,
        type: "reward",
        title: "Stripe Cashout Sent! 💰",
        message: `$${amount}.00 has been sent to your Stripe account.`,
        isRead: false,
      });

      res.json({ ...cashout, transferId: transfer.id });
    } catch (e: any) {
      console.error('Stripe driver cashout error:', e.message);
      res.status(500).json({ message: e.message || "Failed to process Stripe cashout" });
    }
  });

  // Stripe payment routes
  app.post('/api/stripe/create-hop-payment', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { hopId, distanceMiles } = req.body;
      if (!hopId) return res.status(400).json({ message: "Missing hop ID" });
      const distance = Number(distanceMiles);
      if (!distance || distance <= 0 || distance > 100) {
        return res.status(400).json({ message: "Invalid distance" });
      }
      const RATE_PER_MILE_CENTS = 300;
      const amountCents = Math.round(distance * RATE_PER_MILE_CENTS);
      const minChargeCents = 150;
      const finalAmount = Math.max(amountCents, minChargeCents);

      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ShortHop Ride (${distance.toFixed(1)} mi)`,
              description: `$1.50/half-mile × ${distance.toFixed(1)} miles`,
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: {
          hopId: String(hopId),
          userId: String(req.user.id),
          distanceMiles: String(distance),
          driverWheels: String(Math.max(1, Math.round(distance))),
        },
        success_url: `https://${domain}/dashboard?payment=success`,
        cancel_url: `https://${domain}/dashboard?payment=cancelled`,
      });
      res.json({ url: checkoutSession.url, amount: finalAmount });
    } catch (e: any) {
      console.error('Stripe checkout error:', e.message);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.get('/api/stripe/balance', requireAdmin, async (_req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const balance = await stripe.balance.retrieve();
      res.json({
        available: balance.available.map(b => ({ amount: b.amount, currency: b.currency })),
        pending: balance.pending.map(b => ({ amount: b.amount, currency: b.currency })),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to get balance" });
    }
  });

  app.post('/api/stripe/create-payout', requireAdmin, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount < 100) return res.status(400).json({ message: "Minimum payout is $1.00" });
      const stripe = await getUncachableStripeClient();
      const payout = await stripe.payouts.create({
        amount,
        currency: 'usd',
      });
      res.json({ id: payout.id, amount: payout.amount, status: payout.status });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to create payout" });
    }
  });

  app.get('/api/stripe/account', requireAdmin, async (_req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve();
      res.json({
        id: account.id,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        externalAccounts: account.external_accounts?.data?.map((ea: any) => ({
          id: ea.id,
          type: ea.object,
          last4: ea.last4,
          bank_name: ea.bank_name,
          brand: ea.brand,
        })) || [],
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to get account" });
    }
  });

  app.get('/api/languages', (_req, res) => {
    res.json(getLanguages());
  });

  app.post('/api/translate', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { text, from, to } = req.body;
    if (!text || !to) return res.status(400).json({ message: "Missing text or target language" });
    try {
      const translated = await translateText(text, from || "en", to);
      res.json({ translated, from: from || "en", to });
    } catch {
      res.json({ translated: text, from: from || "en", to });
    }
  });

  return httpServer;
}
