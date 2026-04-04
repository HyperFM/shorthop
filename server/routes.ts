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
import { db } from "./db";
import { notifications, founderMessages, vipMessages, cityMessages, shortHops, users, donations, routineRoutes, spontaneousStops, contactMessages, cashoutRequests } from "@shared/schema";
import { eq, and, lt, isNotNull, desc, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { filterMessage } from "./contentFilter";

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, idPhoto, idSelfie, ...safe } = user;
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

const MAX_DEVIATION_MILES = 2.0;
const MAX_DETOUR_MILES = 2.0;
const MAX_TIME_DIFF_MS = 30 * 60 * 1000;
const MATCH_CYCLE_INTERVAL_MS = 5000;
const MAX_DIRECTION_ANGLE = Math.PI / 3;

function getRemainingRoute(
  routePoints: [number, number][],
  driverLat: number,
  driverLng: number
): [number, number][] {
  if (routePoints.length < 2) return routePoints;
  let closestIdx = 0;
  let closestDist = Infinity;
  for (let i = 0; i < routePoints.length; i++) {
    const d = getDistance(driverLat, driverLng, routePoints[i][0], routePoints[i][1]);
    if (d < closestDist) {
      closestDist = d;
      closestIdx = i;
    }
  }
  const remaining: [number, number][] = [[driverLat, driverLng], ...routePoints.slice(closestIdx)];
  return remaining;
}

function getBearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return Math.atan2(y, x);
}

function orderStopsAlongRoute(
  driverLat: number,
  driverLng: number,
  driverDestLat: number,
  driverDestLng: number,
  hops: { id: number; startLat: string; startLng: string; endLat: string; endLng: string; status: string }[]
): { hopId: number; type: "pickup" | "dropoff"; lat: number; lng: number }[] {
  const stops: { hopId: number; type: "pickup" | "dropoff"; lat: number; lng: number; progress: number }[] = [];
  const routeBearing = getBearingRad(driverLat, driverLng, driverDestLat, driverDestLng);
  const routeLen = getDistance(driverLat, driverLng, driverDestLat, driverDestLng);

  for (const hop of hops) {
    if (hop.status === "matched") {
      const pLat = parseFloat(hop.startLat || "0");
      const pLng = parseFloat(hop.startLng || "0");
      if (pLat && pLng) {
        const dist = getDistance(driverLat, driverLng, pLat, pLng);
        const bearing = getBearingRad(driverLat, driverLng, pLat, pLng);
        const angleDiff = bearing - routeBearing;
        const projection = dist * Math.cos(angleDiff);
        stops.push({ hopId: hop.id, type: "pickup", lat: pLat, lng: pLng, progress: projection / (routeLen || 1) });
      }
    }
    if (hop.status === "matched" || hop.status === "in_ride") {
      const dLat = parseFloat(hop.endLat || "0");
      const dLng = parseFloat(hop.endLng || "0");
      if (dLat && dLng) {
        const dist = getDistance(driverLat, driverLng, dLat, dLng);
        const bearing = getBearingRad(driverLat, driverLng, dLat, dLng);
        const angleDiff = bearing - routeBearing;
        const projection = dist * Math.cos(angleDiff);
        stops.push({ hopId: hop.id, type: "dropoff", lat: dLat, lng: dLng, progress: projection / (routeLen || 1) });
      }
    }
  }

  stops.sort((a, b) => a.progress - b.progress);
  return stops.map(s => ({ hopId: s.hopId, type: s.type, lat: s.lat, lng: s.lng }));
}

function distToPolyline(lat: number, lng: number, points: [number, number][]): number {
  if (points.length < 2) return points.length === 1 ? getDistance(lat, lng, points[0][0], points[0][1]) : Infinity;
  let minDist = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const [cLat, cLng] = closestPointOnSegment(lat, lng, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    const d = getDistance(lat, lng, cLat, cLng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function progressAlongRoute(lat: number, lng: number, points: [number, number][]): number {
  if (points.length < 2) return 0;
  let cumDist = 0;
  let bestProgress = 0;
  let bestDist = Infinity;
  const segLengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segLengths.push(getDistance(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]));
  }
  const totalLen = segLengths.reduce((s, d) => s + d, 0);
  if (totalLen === 0) return 0;

  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i][0], ay = points[i][1];
    const bx = points[i + 1][0], by = points[i + 1][1];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((lat - ax) * dx + (lng - ay) * dy) / lenSq));
    }
    const cLat = ax + t * dx, cLng = ay + t * dy;
    const d = getDistance(lat, lng, cLat, cLng);
    if (d < bestDist) {
      bestDist = d;
      bestProgress = (cumDist + t * segLengths[i]) / totalLen;
    }
    cumDist += segLengths[i];
  }
  return bestProgress;
}

function isDropoffPastDestination(dropLat: number, dropLng: number, routeStartLat: number, routeStartLng: number, routeEndLat: number, routeEndLng: number): boolean {
  const routeDist = getDistance(routeStartLat, routeStartLng, routeEndLat, routeEndLng);
  const dropDist = getDistance(routeStartLat, routeStartLng, dropLat, dropLng);
  if (dropDist <= routeDist + MAX_DEVIATION_MILES) return false;
  const routeBearing = Math.atan2(routeEndLng - routeStartLng, routeEndLat - routeStartLat);
  const dropBearing = Math.atan2(dropLng - routeEndLng, dropLat - routeEndLat);
  const angleDiff = Math.abs(routeBearing - dropBearing);
  const normalized = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
  return normalized < Math.PI / 2;
}

interface MatchScore {
  valid: boolean;
  pickupDist: number;
  dropoffDist: number;
  totalDeviation: number;
  detourMiles: number;
}

function scoreHopMatchForDriver(
  hop: any,
  driverSeats: number,
  driverLoc: { latitude: number; longitude: number; updatedAt: number } | undefined,
  driverRoutes: any[],
  driverId?: number
): MatchScore {
  const fail: MatchScore = { valid: false, pickupDist: Infinity, dropoffDist: Infinity, totalDeviation: Infinity, detourMiles: Infinity };
  const tag = `  [hop${hop.id}↔drv${driverId || '?'}]`;
  const now = new Date();

  if (hop.status !== "requested") { return fail; }
  if (hop.timeWindowExpiry && new Date(hop.timeWindowExpiry) < now) {
    console.log(`${tag} FAIL: time window expired`);
    return fail;
  }
  if ((hop.seatsNeeded || 1) > driverSeats) {
    console.log(`${tag} FAIL: needs ${hop.seatsNeeded} seats, driver has ${driverSeats}`);
    return fail;
  }

  if (hop.departureTime) {
    const depTime = new Date(hop.departureTime).getTime();
    const nowMs = now.getTime();
    const diff = depTime - nowMs;
    if (diff > MAX_TIME_DIFF_MS) {
      console.log(`${tag} FAIL: departure too far in future (${Math.round(diff / 60000)}min away)`);
      return fail;
    }
    if (-diff > MAX_TIME_DIFF_MS) {
      console.log(`${tag} FAIL: departure window expired (${Math.round(-diff / 60000)}min ago)`);
      return fail;
    }
  }

  const hopStartLat = parseFloat(hop.startLat || "0");
  const hopStartLng = parseFloat(hop.startLng || "0");
  const hopEndLat = parseFloat(hop.endLat || "0");
  const hopEndLng = parseFloat(hop.endLng || "0");

  if (!hopStartLat || !hopStartLng || !hopEndLat || !hopEndLng) {
    console.log(`${tag} FAIL: hop missing coordinates (${hopStartLat},${hopStartLng})→(${hopEndLat},${hopEndLng})`);
    return fail;
  }

  if (driverRoutes.length === 0) {
    console.log(`${tag} FAIL: no routes saved for driver`);
    return fail;
  }

  const hopBearing = getBearingRad(hopStartLat, hopStartLng, hopEndLat, hopEndLng);

  let bestPickupDist = Infinity;
  let bestDropoffDist = Infinity;
  let bestDetour = Infinity;
  let matchedAnyRoute = false;

  for (const route of driverRoutes) {
    if (route.startTime && route.endTime && route.days) {
      const routeNow = new Date();
      const currentDay = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][routeNow.getDay()];
      const routeDays = (route.days as string[]) || [];
      if (routeDays.length > 0 && !routeDays.some((d: string) => currentDay.startsWith(d.toLowerCase()) || d.toLowerCase() === currentDay)) {
        console.log(`${tag} Route "${route.name}" skipped: not scheduled today (${currentDay})`);
        continue;
      }
      const currentMinutes = routeNow.getHours() * 60 + routeNow.getMinutes();
      const startMin = parseTimeToMinutes(route.startTime);
      const endMin = parseTimeToMinutes(route.endTime);
      if (startMin !== null && endMin !== null) {
        const windowStart = startMin - 60;
        const windowEnd = endMin < startMin ? endMin + 1440 + 30 : endMin + 30;
        const adjustedCurrent = currentMinutes < windowStart && endMin < startMin ? currentMinutes + 1440 : currentMinutes;
        if (adjustedCurrent < windowStart || adjustedCurrent > windowEnd) {
          console.log(`${tag} Route "${route.name}" skipped: outside time window (now=${currentMinutes}min, window=${windowStart < 0 ? windowStart + 1440 : windowStart}-${(windowEnd % 1440)}min)`);
          continue;
        }
      }
    }

    const rStartLat = parseFloat(route.startLat || "0");
    const rStartLng = parseFloat(route.startLng || "0");
    const rEndLat = parseFloat(route.endLat || "0");
    const rEndLng = parseFloat(route.endLng || "0");
    if (!rEndLat || !rEndLng) {
      console.log(`${tag} Route "${route.name}" skipped: missing endLat/endLng`);
      continue;
    }

    let routePoints: [number, number][] = [];
    if (rStartLat && rStartLng) routePoints.push([rStartLat, rStartLng]);
    routePoints.push([rEndLat, rEndLng]);

    if (driverLoc && Date.now() - driverLoc.updatedAt < 120000) {
      routePoints = [[driverLoc.latitude, driverLoc.longitude], ...routePoints.slice(routePoints.length > 1 ? 1 : 0)];
    }

    const routeStart = routePoints[0];
    const routeEnd = routePoints[routePoints.length - 1];
    const routeBearing = getBearingRad(routeStart[0], routeStart[1], routeEnd[0], routeEnd[1]);
    let dirAngleDiff = Math.abs(hopBearing - routeBearing);
    if (dirAngleDiff > Math.PI) dirAngleDiff = 2 * Math.PI - dirAngleDiff;
    console.log(`${tag} Route "${route.name}": ${routePoints.map(p => `(${p[0].toFixed(4)},${p[1].toFixed(4)})`).join('→')} | hopDir=${(hopBearing * 180 / Math.PI).toFixed(0)}° routeDir=${(routeBearing * 180 / Math.PI).toFixed(0)}° diff=${(dirAngleDiff * 180 / Math.PI).toFixed(0)}°`);

    if (dirAngleDiff > MAX_DIRECTION_ANGLE) {
      console.log(`${tag}   SKIP: rider traveling opposite direction (${(dirAngleDiff * 180 / Math.PI).toFixed(0)}° > ${(MAX_DIRECTION_ANGLE * 180 / Math.PI).toFixed(0)}°)`);
      continue;
    }

    const pickupToRoute = distToPolyline(hopStartLat, hopStartLng, routePoints);
    console.log(`${tag}   pickup dist to route: ${pickupToRoute.toFixed(3)}mi (max ${MAX_DEVIATION_MILES})`);
    if (pickupToRoute > MAX_DEVIATION_MILES) {
      console.log(`${tag}   SKIP: pickup too far from route`);
      continue;
    }

    const dropoffToRoute = distToPolyline(hopEndLat, hopEndLng, routePoints);
    console.log(`${tag}   dropoff dist to route: ${dropoffToRoute.toFixed(3)}mi (max ${MAX_DEVIATION_MILES})`);
    if (dropoffToRoute > MAX_DEVIATION_MILES) {
      console.log(`${tag}   SKIP: dropoff too far from route`);
      continue;
    }

    const pickupProgress = progressAlongRoute(hopStartLat, hopStartLng, routePoints);
    const dropoffProgress = progressAlongRoute(hopEndLat, hopEndLng, routePoints);
    console.log(`${tag}   pickup progress: ${(pickupProgress * 100).toFixed(1)}%, dropoff progress: ${(dropoffProgress * 100).toFixed(1)}%`);

    if (dropoffProgress <= pickupProgress) {
      console.log(`${tag}   SKIP: backtracking — dropoff is before pickup along route`);
      continue;
    }

    if (isDropoffPastDestination(hopEndLat, hopEndLng, routePoints[0][0], routePoints[0][1], rEndLat, rEndLng)) {
      console.log(`${tag}   SKIP: dropoff is past driver's destination`);
      continue;
    }

    const driverStart = routePoints[0];
    const driverEnd = routePoints[routePoints.length - 1];
    const directDist = getDistance(driverStart[0], driverStart[1], driverEnd[0], driverEnd[1]);
    const detouredDist =
      getDistance(driverStart[0], driverStart[1], hopStartLat, hopStartLng) +
      getDistance(hopStartLat, hopStartLng, hopEndLat, hopEndLng) +
      getDistance(hopEndLat, hopEndLng, driverEnd[0], driverEnd[1]);
    const detour = Math.max(0, detouredDist - directDist);

    console.log(`${tag}   detour: ${detour.toFixed(3)}mi (direct=${directDist.toFixed(3)}, detoured=${detouredDist.toFixed(3)}, soft cap ${MAX_DETOUR_MILES})`);

    console.log(`${tag}   MATCH on route "${route.name}" ✓`);
    matchedAnyRoute = true;
    if (pickupToRoute < bestPickupDist) bestPickupDist = pickupToRoute;
    if (dropoffToRoute < bestDropoffDist) bestDropoffDist = dropoffToRoute;
    if (detour < bestDetour) bestDetour = detour;
  }

  if (!matchedAnyRoute) {
    console.log(`${tag} FAIL: no compatible route found (${driverRoutes.length} checked)`);
    return fail;
  }

  console.log(`${tag} VALID: pickup=${bestPickupDist.toFixed(3)}mi, dropoff=${bestDropoffDist.toFixed(3)}mi, detour=${bestDetour.toFixed(3)}mi`);
  return {
    valid: true,
    pickupDist: bestPickupDist,
    dropoffDist: bestDropoffDist,
    totalDeviation: bestPickupDist + bestDropoffDist,
    detourMiles: bestDetour,
  };
}

const pendingAdditionalHops: Map<number, { hopId: number; driverId: number; hopperDest: string; createdAt: number }> = new Map();
const stillSearchingNotified: Set<number> = new Set();

async function executeMatch(hopId: number, driverId: number, isStar: boolean, hop: any) {
  const matched = await storage.acceptHop(hopId, driverId);
  console.log(`[PAYMENT] MATCH: hop${hopId} | PI=${matched.paymentIntentId || 'none'} | paymentStatus=${matched.paymentStatus} | payment held (not captured until ride starts)`);
  const starLabel = isStar ? " Your Star Hopper!" : "";
  await storage.createNotification({
    userId: driverId,
    type: "match_found",
    title: isStar ? "Star Match! ⭐" : "Match Found! 🎯",
    message: `A hopper going to ${hop.endLocation} matched with your route.${starLabel}`,
    isRead: false,
  });
  await storage.createNotification({
    userId: hop.walkerId,
    type: "match_found",
    title: isStar ? "Star Match! ⭐" : "Driver Found! 🚗",
    message: `You've been matched with a driver heading your way.${starLabel}`,
    isRead: false,
  });
  console.log(`✅ MATCH CONFIRMED: hop${hopId} → driver${driverId} (hopper=${hop.walkerId}, dest="${hop.endLocation}", star=${isStar})`);
}

let matchingCycleRunning = false;

function parseTimeToMinutes(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2]);
  if (m[3]) {
    if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  }
  return h * 60 + mn;
}

async function autoActivateScheduledDrivers() {
  try {
    const now = new Date();
    const currentDay = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const allRoutes = await db.select().from(routineRoutes).where(eq(routineRoutes.isActive, true));
    for (const route of allRoutes) {
      const days = (route.days as string[]) || [];
      if (!days.some(d => d.toLowerCase() === currentDay)) continue;

      const routeStartMinutes = parseTimeToMinutes(route.startTime || "");
      if (routeStartMinutes === null) continue;

      const diffMinutes = routeStartMinutes - currentMinutes;

      if (diffMinutes > 0 && diffMinutes <= 60) {
        const driver = await storage.getUser(route.driverId);
        if (driver && driver.isDriver && driver.driverVerified && !driver.isDisabled && !driver.isActive) {
          await storage.setDriverActive(route.driverId, true);
          console.log(`[AUTO-ACTIVATE] Driver ${route.driverId} auto-activated ${diffMinutes}min before route "${route.name}" (${route.startTime})`);
        }
      }
    }
  } catch (err) {
    console.error("[AUTO-ACTIVATE] Error:", err);
  }
}

async function runMatchingCycle() {
  if (matchingCycleRunning) return;
  matchingCycleRunning = true;
  try {
    await autoActivateScheduledDrivers();

    const allAvailable = await storage.getAvailableHops();
    if (allAvailable.length === 0) { return; }

    const BACKGROUND_NOTIFY_MS = 5 * 60 * 1000;
    const now = Date.now();
    for (const hop of allAvailable) {
      if (hop.status === "requested" && hop.createdAt && !stillSearchingNotified.has(hop.id)) {
        const hopAge = now - new Date(hop.createdAt).getTime();
        if (hopAge >= BACKGROUND_NOTIFY_MS) {
          stillSearchingNotified.add(hop.id);
          await storage.createNotification({
            userId: hop.walkerId,
            type: "search_update",
            title: "Still Searching 🔍",
            message: "We're still looking for a driver on your route. Hang tight — we'll notify you as soon as someone matches!",
            isRead: false,
          });
          console.log(`[MATCH] 5-min background search notification sent to user${hop.walkerId} for hop${hop.id}`);
        }
      } else if (hop.status !== "requested") {
        stillSearchingNotified.delete(hop.id);
      }
    }

    const activeDrivers = await storage.getActiveDrivers();
    if (activeDrivers.length === 0) {
      console.log(`Matching: ${allAvailable.length} hops waiting but no active drivers`);
      return;
    }
    console.log(`Matching: evaluating ${allAvailable.length} hop(s) against ${activeDrivers.length} driver(s)`);

    const matchedHopIds = new Set<number>();
    const driverSeatTracker: Map<number, number> = new Map();

    interface Candidate {
      hop: any;
      driver: any;
      isStar: boolean;
      score: MatchScore;
      driverInRide: boolean;
    }

    const candidates: Candidate[] = [];

    for (const driver of activeDrivers) {
      const driverLoc = liveLocations.get(driver.id);
      const driverRoutes = await storage.getRoutes(driver.id);
      const driverSeats = driver.availableSeats || 1;
      driverSeatTracker.set(driver.id, driverSeats);
      const driverStarIds = await storage.getStarHopperUserIds(driver.id);
      const starSet = new Set(driverStarIds);

      const driverHops = await storage.getHopsForDriver(driver.id);
      const activeHops = driverHops.filter((h: any) => h.status === "matched" || h.status === "in_ride");
      const driverInRide = activeHops.length > 0;
      const activeRideSeatsUsed = activeHops.reduce((sum: number, h: any) => sum + (h.seatsNeeded || 1), 0);
      const effectiveSeats = Math.max(0, driverSeats - activeRideSeatsUsed);
      driverSeatTracker.set(driver.id, effectiveSeats);
      if (driverInRide) {
        console.log(`  Driver ${driver.id}: already in ride (${activeHops.length} active hop(s): ${activeHops.map((h: any) => `hop${h.id}[${h.status}]`).join(', ')}), effective seats: ${effectiveSeats}/${driverSeats}`);
      } else {
        console.log(`  Driver ${driver.id}: free, ${effectiveSeats} seat(s) available`);
      }

      for (const hop of allAvailable) {
        if (hop.walkerId === driver.id) {
          console.log(`  [hop${hop.id}↔drv${driver.id}] SKIP: self-match (driver is the hopper)`);
          continue;
        }
        const score = scoreHopMatchForDriver(hop, effectiveSeats, driverLoc, driverRoutes, driver.id);
        if (!score.valid) continue;

        const driverStarredHopper = starSet.has(hop.walkerId);
        const hopperStarredDriver = await storage.isStarHopper(hop.walkerId, driver.id);

        candidates.push({
          hop,
          driver,
          isStar: driverStarredHopper || hopperStarredDriver,
          score,
          driverInRide,
        });
      }
    }

    candidates.sort((a, b) => {
      const aMax = a.driver.matchPreference === "maximize_seats" ? 1 : 0;
      const bMax = b.driver.matchPreference === "maximize_seats" ? 1 : 0;
      if (aMax !== bMax) return bMax - aMax;
      if (a.isStar !== b.isStar) return b.isStar ? 1 : -1;
      const aScore = a.score.totalDeviation + a.score.detourMiles;
      const bScore = b.score.totalDeviation + b.score.detourMiles;
      return aScore - bScore;
    });

    console.log(`Matching: ${candidates.length} valid candidate(s) found, executing...`);
    for (const c of candidates) {
      if (matchedHopIds.has(c.hop.id)) {
        console.log(`  [hop${c.hop.id}↔drv${c.driver.id}] SKIP-EXEC: hop already matched this cycle`);
        continue;
      }
      const remainingSeats = driverSeatTracker.get(c.driver.id) || 0;
      const seatsNeeded = c.hop.seatsNeeded || 1;
      if (seatsNeeded > remainingSeats) {
        console.log(`  [hop${c.hop.id}↔drv${c.driver.id}] SKIP-EXEC: needs ${seatsNeeded} seats, driver has ${remainingSeats} remaining`);
        continue;
      }

      const isMaximize = c.driver.matchPreference === "maximize_seats";
      const isOneRider = !isMaximize;

      if (c.driverInRide) {
        if (isMaximize) {
          console.log(`  [hop${c.hop.id}↔drv${c.driver.id}] AUTO-ADD: driver in ride with maximize_seats, auto-matching additional hopper (seats=${seatsNeeded}/${remainingSeats})`);
          await executeMatch(c.hop.id, c.driver.id, c.isStar, c.hop);
          matchedHopIds.add(c.hop.id);
          driverSeatTracker.set(c.driver.id, remainingSeats - seatsNeeded);
        } else {
          console.log(`  [hop${c.hop.id}↔drv${c.driver.id}] DIVERT: driver already in ride, adding as pending additional hopper`);
          if (!pendingAdditionalHops.has(c.hop.id)) {
            pendingAdditionalHops.set(c.hop.id, {
              hopId: c.hop.id,
              driverId: c.driver.id,
              hopperDest: c.hop.endLocation || "nearby",
              createdAt: Date.now(),
            });
            await storage.createNotification({
              userId: c.driver.id,
              type: "additional_hopper",
              title: "New Hopper Request 🚏",
              message: `A hopper going to ${c.hop.endLocation || "nearby"} fits your route. Accept or decline from your ride panel.`,
              isRead: false,
            });
          }
        }
        continue;
      }

      console.log(`  [hop${c.hop.id}↔drv${c.driver.id}] EXECUTING MATCH (star=${c.isStar}, seats=${seatsNeeded}/${remainingSeats})`);
      await executeMatch(c.hop.id, c.driver.id, c.isStar, c.hop);
      matchedHopIds.add(c.hop.id);
      driverSeatTracker.set(c.driver.id, remainingSeats - seatsNeeded);

      if (isOneRider) {
        driverSeatTracker.set(c.driver.id, 0);
      }
    }
  } catch (err) {
    console.error("Matching cycle error:", err);
  } finally {
    matchingCycleRunning = false;
  }
}

let matchingCycleTimer: ReturnType<typeof setInterval> | null = null;

function startMatchingCycle() {
  if (matchingCycleTimer) return;
  matchingCycleTimer = setInterval(runMatchingCycle, MATCH_CYCLE_INTERVAL_MS);
  console.log(`Matching cycle started (every ${MATCH_CYCLE_INTERVAL_MS / 1000}s)`);
}

async function tryAutoMatch(_hopId: number) {
}

async function tryAutoMatchForDriver(_driverId: number) {
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
        username, password, isDriver: false,
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
    
    const walkerHops = await storage.getHopsForWalker(req.user.id);

    if (req.user.isDriver) {
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const enriched = await Promise.all(driverHops.map(async (hop) => {
        if ((hop.status === "matched" || hop.status === "in_ride") && hop.walkerId) {
          const walker = await storage.getUser(hop.walkerId);
          if (walker) {
            return { ...hop, walker: { username: walker.username, profilePhoto: walker.profilePhoto, rideVibe: walker.rideVibe, bio: walker.bio, phone: walker.phone } };
          }
        }
        return hop;
      }));
      const driverHopIds = new Set(enriched.map(h => h.id));
      const combined = [...enriched, ...walkerHops.filter(h => !driverHopIds.has(h.id))];
      res.json(combined);
    } else {
      res.json(walkerHops);
    }
  });

  app.post(api.hops.requestMovement.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.hops.requestMovement.input.parse(req.body);

      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      if (!currentUser.phone) {
        return res.status(400).json({ message: "A phone number is required to request a hop. Please add your phone number in your profile settings." });
      }

      if (input.hopType === "flex_hop" && currentUser.subscription !== "flex_hop" && currentUser.subscription !== "power_hop") {
        return res.status(403).json({ message: "Flex Hop requires an active Flex Hop or Power Hop subscription." });
      }
      if (input.hopType === "full_ride" && currentUser.subscription !== "power_hop") {
        return res.status(403).json({ message: "Power Hop requires an active Power Hop subscription." });
      }
      
      const miles = parseFloat(input.distanceMiles || "1");
      const driverEarningsCents = Math.floor(miles * 100);
      const priceCents = driverEarningsCents;

      const isMicroHop = req.body.microHop === true || (miles > 0 && miles <= 1);

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
        paymentIntentId: input.paymentIntentId || null,
        paymentStatus: input.paymentStatus || "none",
        paymentAmountCents: input.paymentAmountCents || null,
        departureTime: input.departureTime ? new Date(input.departureTime) : null,
        arrivalDeadline: input.arrivalDeadline ? new Date(input.arrivalDeadline) : null,
        timeWindowExpiry: input.timeWindowExpiry ? new Date(input.timeWindowExpiry) : null,
        microHop: isMicroHop,
        seatsNeeded: currentUser.seatsNeeded || 1,
      });
      res.status(201).json(hop);
      tryAutoMatch(hop.id);
    } catch (err: any) {
      const paymentIntentId = req.body?.paymentIntentId;
      if (paymentIntentId && req.isAuthenticated()) {
        try {
          const stripe = await getUncachableStripeClient();
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (pi.metadata?.userId !== String(req.user.id)) {
            console.warn(`Refund blocked: PI ${paymentIntentId} userId mismatch (${pi.metadata?.userId} vs ${req.user.id})`);
          } else if (pi.status === "requires_capture") {
            await stripe.paymentIntents.cancel(paymentIntentId);
            console.log(`Auto-cancelled PI ${paymentIntentId} after hop creation failed`);
          } else if (pi.status === "succeeded") {
            await stripe.refunds.create({ payment_intent: paymentIntentId });
            console.log(`Auto-refunded PI ${paymentIntentId} after hop creation failed`);
          }
        } catch (refundErr: any) {
          console.error(`Failed to auto-refund PI ${paymentIntentId}:`, refundErr.message);
        }
      }
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error('Hop creation error:', err.message || err);
        res.status(500).json({ message: "Failed to create hop request" });
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

       const existingHop = await storage.getHop(Number(req.params.id));
       if (!existingHop) return res.status(404).json({ message: "Hop not found" });

       if (existingHop.walkerId === req.user.id) {
         return res.status(400).json({ message: "You cannot accept your own hop request" });
       }

       if (existingHop.timeWindowExpiry && new Date(existingHop.timeWindowExpiry) < new Date()) {
         return res.status(400).json({ message: "This hop's time window has expired" });
       }

       if ((existingHop.seatsNeeded || 1) > (driver.availableSeats || 1)) {
         return res.status(400).json({ message: `This rider needs ${existingHop.seatsNeeded} seats but you only have ${driver.availableSeats || 1} available` });
       }

       const hop = await storage.acceptHop(Number(req.params.id), req.user.id);
       console.log(`[PAYMENT] MANUAL ACCEPT: hop${hop.id} | PI=${hop.paymentIntentId || 'none'} | paymentStatus=${hop.paymentStatus} | payment held (not captured until ride starts)`);

       res.json(hop);
    } catch (e) {
       res.status(404).json({ message: "Hop not found" });
    }
  });

  async function finalizeHopCompletion(hopId: number, driverId: number) {
    const [targetHop] = await db.select().from(shortHops).where(eq(shortHops.id, hopId));
    if (!targetHop) throw new Error("Hop not found");

    let distanceMiles = targetHop.distanceMiles || "1";
    if (targetHop.startLat && targetHop.startLng && targetHop.endLat && targetHop.endLng) {
      const calcDist = getDistance(
        parseFloat(String(targetHop.startLat)),
        parseFloat(String(targetHop.startLng)),
        parseFloat(String(targetHop.endLat)),
        parseFloat(String(targetHop.endLng))
      );
      distanceMiles = String(Math.max(0.1, Math.round(calcDist * 10) / 10));
    }

    const hop = await storage.completeHop(hopId, distanceMiles);
    console.log(`[PAYMENT] HOP COMPLETED: hop${hop.id} | distance=${distanceMiles}mi | PI=${targetHop.paymentIntentId || 'none'} | paymentStatus=${targetHop.paymentStatus} | driver=${driverId}`);

    try {
      const earnings = await storage.processDriverEarnings(hop.id, distanceMiles, targetHop.paymentIntentId || undefined);
      console.log(`[PAYMENT] DRIVER EARNINGS: hop${hop.id} | ${earnings} Wheels credited to driver ${driverId}`);
    } catch (earningsErr: any) {
      console.error(`[PAYMENT] EARNINGS DEFERRED: hop${hop.id} | ${earningsErr.message}`);
    }

    const driverStreak = await storage.updateHopStreak(driverId);
    for (const badge of driverStreak.newBadges) {
      const todayCount = await storage.getNotificationCountToday(driverId);
      if (todayCount < 5) {
        await storage.createNotification({
          userId: driverId,
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

    if (hop.endLocation) {
      await db.update(users).set({
        lastCompletedRouteId: hop.id,
        lastCompletedRouteName: hop.endLocation,
      }).where(eq(users.id, driverId));
      if (hop.walkerId) {
        await db.update(users).set({
          lastCompletedRouteId: hop.id,
          lastCompletedRouteName: hop.endLocation,
        }).where(eq(users.id, hop.walkerId));
      }
    }

    const now = new Date();
    await storage.upsertActivityWindow(driverId, now.getDay(), now.getHours(), Math.min(now.getHours() + 1, 23));

    return hop;
  }

  app.post(api.hops.complete.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isDriver) return res.status(401).json({ message: "Unauthorized" });
    try {
       const existingHops = await storage.getHopsForDriver(req.user.id);
       const targetHop = existingHops.find(h => h.id === Number(req.params.id) && h.status === "in_ride");
       if (!targetHop) return res.status(403).json({ message: "Not authorized to complete this hop" });

       const { driverLat, driverLng } = req.body;
       if (targetHop.endLat && targetHop.endLng && driverLat && driverLng) {
         const distToDestination = getDistance(
           parseFloat(String(driverLat)),
           parseFloat(String(driverLng)),
           parseFloat(String(targetHop.endLat)),
           parseFloat(String(targetHop.endLng))
         );
         if (distToDestination > 0.31) {
           return res.status(400).json({ 
             message: "Too far from destination to complete ride. Drive closer to the drop-off point.",
             distanceToDestination: Math.round(distToDestination * 100) / 100
           });
         }
       }

       await db.update(shortHops).set({ driverConfirmedComplete: true }).where(eq(shortHops.id, targetHop.id));
       const [refreshedHop] = await db.select().from(shortHops).where(eq(shortHops.id, targetHop.id));
       console.log(`[RIDE] DRIVER CONFIRMED COMPLETE: hop${targetHop.id} | driver=${req.user.id} | hopperConfirmed=${refreshedHop.hopperConfirmedComplete}`);

       if (refreshedHop.hopperConfirmedComplete) {
         const hop = await finalizeHopCompletion(targetHop.id, req.user.id);
         return res.json({ ...hop, bothConfirmed: true });
       }

       if (targetHop.walkerId) {
         const todayCount = await storage.getNotificationCountToday(targetHop.walkerId);
         if (todayCount < 10) {
           await storage.createNotification({
             userId: targetHop.walkerId,
             type: "ride_complete_confirm",
             title: "Confirm Arrival",
             message: "Your driver says you've arrived. Please confirm to complete the ride.",
             isRead: false,
           });
         }
       }

       const [updated] = await db.select().from(shortHops).where(eq(shortHops.id, targetHop.id));
       res.json({ ...updated, bothConfirmed: false, waitingForHopper: true });
    } catch (e) {
       res.status(404).json({ message: "Hop not found" });
    }
  });

  app.post('/api/hops/:id/hopper-confirm-complete', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const [hop] = await db.select().from(shortHops).where(eq(shortHops.id, hopId));
      if (!hop || hop.walkerId !== req.user.id) return res.status(403).json({ message: "Not authorized" });
      if (hop.status === "completed") return res.json({ ...hop, bothConfirmed: true });

      await db.update(shortHops).set({ hopperConfirmedComplete: true }).where(eq(shortHops.id, hopId));
      const [refreshedHop] = await db.select().from(shortHops).where(eq(shortHops.id, hopId));
      console.log(`[RIDE] HOPPER CONFIRMED COMPLETE: hop${hopId} | hopper=${req.user.id} | driverConfirmed=${refreshedHop.driverConfirmedComplete}`);

      if (refreshedHop.driverConfirmedComplete && refreshedHop.driverId) {
        const completed = await finalizeHopCompletion(hopId, refreshedHop.driverId);
        return res.json({ ...completed, bothConfirmed: true });
      }

      const [updated] = await db.select().from(shortHops).where(eq(shortHops.id, hopId));
      res.json({ ...updated, bothConfirmed: false, waitingForDriver: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to confirm completion" });
    }
  });

  app.post('/api/hops/:id/cancel', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const existingHop = await storage.getHop(Number(req.params.id));

      if (existingHop && existingHop.status === "in_ride" && existingHop.paymentIntentId && existingHop.walkerId === req.user.id) {
        return res.status(400).json({ message: "Cannot cancel a ride that's already in progress. Contact support if there's an issue." });
      }

      const hop = await storage.cancelHop(Number(req.params.id), req.user.id);
      let paymentRefunded = false;

      if (existingHop?.paymentIntentId && !existingHop.paymentIntentId.startsWith("wheels_")) {
        try {
          const stripe = await getUncachableStripeClient();
          const pi = await stripe.paymentIntents.retrieve(existingHop.paymentIntentId);

          if (pi.status === "requires_capture") {
            await stripe.paymentIntents.cancel(existingHop.paymentIntentId);
            await db.update(shortHops).set({ paymentStatus: "refunded" }).where(eq(shortHops.id, hop.id));
            paymentRefunded = true;
            console.log(`[PAYMENT] AUTHORIZATION CANCELLED: PI ${existingHop.paymentIntentId} for hop${hop.id} | was ${existingHop.status} | $${(pi.amount / 100).toFixed(2)} released back to hopper`);
          } else if (pi.status === "succeeded") {
            await stripe.refunds.create({ payment_intent: existingHop.paymentIntentId });
            await db.update(shortHops).set({ paymentStatus: "refunded" }).where(eq(shortHops.id, hop.id));
            paymentRefunded = true;
            console.log(`[PAYMENT] REFUNDED: PI ${existingHop.paymentIntentId} for hop${hop.id} | was ${existingHop.status} | $${(pi.amount / 100).toFixed(2)} refunded to hopper`);
          } else {
            console.log(`[PAYMENT] CANCEL SKIPPED: PI ${existingHop.paymentIntentId} status=${pi.status} for hop${hop.id}`);
          }
        } catch (cancelErr: any) {
          console.error(`[PAYMENT] CANCEL/REFUND FAILED: PI ${existingHop.paymentIntentId} for hop${hop.id}:`, cancelErr.message);
        }
      }

      if (existingHop?.paymentIntentId?.startsWith("wheels_") && (existingHop.status === "requested" || existingHop.status === "matched" || existingHop.status === "in_ride")) {
        try {
          const wheelsCost = (existingHop.priceCents || 0) / 100;
          if (wheelsCost > 0 && existingHop.walkerId) {
            await db.update(users).set({ riderCredits: sql`rider_credits + ${wheelsCost}` }).where(eq(users.id, existingHop.walkerId));
            await db.update(shortHops).set({ paymentStatus: "refunded" }).where(eq(shortHops.id, hop.id));
            paymentRefunded = true;
            console.log(`[PAYMENT] WHEELS REFUNDED: ${wheelsCost.toFixed(2)} ride credits returned to user${existingHop.walkerId} for hop${hop.id} | was ${existingHop.status}`);
          }
        } catch (wheelErr: any) {
          console.error(`[PAYMENT] WHEEL REFUND FAILED: hop${hop.id}:`, wheelErr.message);
        }
      }

      if (existingHop?.status === "in_ride" || existingHop?.status === "matched") {
        await storage.logGpsEvent(Number(req.params.id), "ride_cancelled_by_user");
        const driverId = existingHop.driverId;
        if (driverId) {
          await storage.createNotification({
            userId: driverId,
            type: "hop_cancelled",
            title: "Hopper Cancelled 🔄",
            message: `A hopper going to ${existingHop.endLocation || "nearby"} has cancelled. Your route has been updated.`,
            isRead: false,
          });
        }
      }

      pendingAdditionalHops.delete(Number(req.params.id));

      console.log(`[PAYMENT] HOP CANCELLED: hop${hop.id} | previousStatus=${existingHop?.status} | paymentRefunded=${paymentRefunded} | cancelledBy=user${req.user.id}`);
      res.json({ ...hop, paymentRefunded });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to cancel hop" });
    }
  });

  app.post('/api/hops/:id/tip', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const tipCents = Number(req.body.tipCents);
      const useWheels = req.body.useWheels === true;
      if (!tipCents || tipCents < 100 || tipCents > 10000) {
        return res.status(400).json({ message: "Tip must be between $1 and $100" });
      }
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id) return res.status(403).json({ message: "Not your hop" });
      if (hop.status !== "completed") return res.status(400).json({ message: "Hop not completed" });

      const tipWheels = tipCents / 100;

      if (useWheels) {
        const tipDeduct = await db.execute(sql`
          UPDATE users SET rider_credits = rider_credits - ${tipWheels}
          WHERE id = ${req.user.id} AND rider_credits >= ${tipWheels}
          RETURNING rider_credits
        `);
        if (!tipDeduct.rows || tipDeduct.rows.length === 0) {
          return res.status(400).json({ message: "Not enough ride credits" });
        }
        if (hop.driverId) {
          const driverTipWheels = tipCents >= 3000 ? tipWheels * 0.9 : tipWheels;
          await storage.addDriverEarnings(hop.driverId, driverTipWheels, "tip_earning", `Tip from hop#${hopId} (wheels)`, hopId);
        }
        await db.update(shortHops).set({ tipCents: (hop.tipCents || 0) + tipCents }).where(eq(shortHops.id, hopId));
        return res.json({ success: true, method: "wheels" });
      }

      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';

      const tipper = await storage.getUser(req.user.id);
      if (tipper?.stripeCustomerId) {
        const paymentMethods = await stripe.paymentMethods.list({ customer: tipper.stripeCustomerId, type: 'card' });
        if (paymentMethods.data.length > 0) {
          const applicationFee = tipCents >= 3000 ? Math.round(tipCents * 0.10) : 0;
          const paymentIntent = await stripe.paymentIntents.create({
            amount: tipCents,
            currency: 'usd',
            customer: tipper.stripeCustomerId,
            payment_method: paymentMethods.data[0].id,
            off_session: true,
            confirm: true,
            metadata: { userId: String(req.user.id), type: 'tip', hopId: String(hopId), driverId: String(hop.driverId), tipCents: String(tipCents), applicationFee: String(applicationFee) },
          });
          if (paymentIntent.status === 'succeeded') {
            await db.update(shortHops).set({ tipCents: (hop.tipCents || 0) + tipCents }).where(eq(shortHops.id, hopId));
            if (hop.driverId) {
              const driverTipWheels = tipCents >= 3000 ? (tipCents * 0.9) / 100 : tipCents / 100;
              await storage.addDriverEarnings(hop.driverId, driverTipWheels, "tip_earning", `Tip from hop#${hopId} (card)`, hopId, paymentIntent.id);
            }
            return res.json({ success: true, method: "card" });
          }
        }
      }

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
      const notif = await storage.markNotificationRead(Number(req.params.id), req.user.id);
      res.json(notif);
    } catch (e) {
      res.status(404).json({ message: "Notification not found" });
    }
  });

  app.post('/api/notifications/:id/react', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const reaction = req.body.reaction || req.body.emoji;
      if (!["👍", "❤️", "😢", "😮", "😡"].includes(reaction)) return res.status(400).json({ message: "Invalid reaction" });
      const id = Number(req.params.id);
      const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
      if (!notif || notif.userId !== req.user.id) return res.status(404).json({ message: "Not found" });
      const currentReactions = (notif.reactions as Record<string, number>) || {};
      currentReactions[reaction] = (currentReactions[reaction] || 0) + 1;
      const [updated] = await db.update(notifications).set({ reactions: currentReactions }).where(eq(notifications.id, id)).returning();
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Failed to react" });
    }
  });

  app.post('/api/notifications/:id/reply', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { reply } = req.body;
      if (!reply || typeof reply !== "string") return res.status(400).json({ message: "Reply required" });
      const id = Number(req.params.id);
      const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
      if (!notif || notif.userId !== req.user.id) return res.status(404).json({ message: "Not found" });
      const [updated] = await db.update(notifications).set({ reply: reply.slice(0, 500) }).where(eq(notifications.id, id)).returning();
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Failed to reply" });
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
      const sender = await storage.getUser(req.user.id);
      const todayCount = await storage.getNotificationCountToday(addresseeId);
      if (todayCount < 10) {
        await storage.createNotification({
          userId: addresseeId,
          type: "friend_request",
          title: "New Friend Request 👋",
          message: `${sender?.username || "Someone"} wants to connect with you on ShortHop!`,
          isRead: false,
        });
      }
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

  // Direct Messages
  app.get("/api/dm/unread/count", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const count = await storage.getUnreadDMCount(req.user.id);
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.get("/api/dm/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const conversations = await storage.getDMConversations(req.user.id);
      res.json(conversations);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/dm/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const otherUserId = Number(req.params.userId);
    if (!otherUserId || isNaN(otherUserId)) return res.status(400).json({ message: "Invalid user" });
    try {
      const currentUser = await storage.getUser(req.user.id);
      const otherUser = await storage.getUser(otherUserId);
      const isAdmin = currentUser?.username?.toLowerCase() === "hyperfm";
      const otherIsAdmin = otherUser?.username?.toLowerCase() === "hyperfm";
      if (!isAdmin && !otherIsAdmin) {
        const areFriends = await storage.areFriends(req.user.id, otherUserId);
        if (!areFriends) return res.status(403).json({ message: "You can only message friends" });
      }
      const messages = await storage.getDMMessages(req.user.id, otherUserId);
      await storage.markDMsRead(req.user.id, otherUserId);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/dm/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const receiverId = Number(req.params.userId);
    if (!receiverId || isNaN(receiverId)) return res.status(400).json({ message: "Invalid user" });
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) return res.status(400).json({ message: "Message required" });
    try {
      const currentUser = await storage.getUser(req.user.id);
      const receiverUser = await storage.getUser(receiverId);
      const isAdmin = currentUser?.username?.toLowerCase() === "hyperfm";
      const receiverIsAdmin = receiverUser?.username?.toLowerCase() === "hyperfm";
      if (!isAdmin && !receiverIsAdmin) {
        const areFriends = await storage.areFriends(req.user.id, receiverId);
        if (!areFriends) return res.status(403).json({ message: "You can only message friends" });
      }
      const dm = await storage.sendDM(req.user.id, receiverId, message.trim());
      const todayCount = await storage.getNotificationCountToday(receiverId);
      if (todayCount < 15) {
        await storage.createNotification({
          userId: receiverId,
          type: "direct_message",
          title: "New Message 💬",
          message: `${currentUser?.username || "Someone"} sent you a message`,
          isRead: false,
        });
      }
      res.status(201).json(dm);
    } catch (err) {
      res.status(500).json({ message: "Failed to send message" });
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

  app.get("/api/user/profile/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const targetId = parseInt(req.params.id);
      if (isNaN(targetId)) return res.status(400).json({ message: "Invalid user ID" });
      const profile = await storage.getUserProfile(targetId, req.user.id);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch profile" });
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

      if (isWalker) {
        await db.update(shortHops).set({ ratedByWalker: true }).where(eq(shortHops.id, input.tripId));
      } else {
        await db.update(shortHops).set({ ratedByDriver: true }).where(eq(shortHops.id, input.tripId));
      }

      res.status(201).json(rating);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to create rating" });
      }
    }
  });

  app.get('/api/pending-rating', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.tipRatingOptOut) {
        return res.json(null);
      }

      const walkerHops = await storage.getHopsForWalker(req.user.id);
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const allCompleted = [...walkerHops, ...driverHops]
        .filter(h => h.status === "completed" && h.driverId)
        .sort((a, b) => b.id - a.id);

      for (const hop of allCompleted) {
        const isWalker = hop.walkerId === req.user.id;
        const alreadyRated = isWalker ? hop.ratedByWalker : hop.ratedByDriver;
        if (alreadyRated) continue;

        const partnerId = isWalker ? hop.driverId! : hop.walkerId;
        const partner = await storage.getUser(partnerId);
        if (!partner) continue;

        return res.json({
          tripId: hop.id,
          partnerId,
          partnerName: partner.username,
          partnerPhoto: partner.profilePhoto || null,
          partnerRideVibe: isWalker ? (partner.driverConvoComfort || "friendly_chat") : (partner.rideVibe || "friendly_chat"),
          partnerInterests: partner.interests || [],
          partnerBio: partner.bio || null,
          role: isWalker ? "hopper" : "driver",
          distanceMiles: hop.distanceMiles,
          priceCents: hop.priceCents,
        });
      }
      res.json(null);
    } catch {
      res.status(500).json({ message: "Failed to check pending rating" });
    }
  });

  app.post('/api/pending-rating/:hopId/dismiss', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = parseInt(req.params.hopId);
      if (isNaN(hopId)) return res.status(400).json({ message: "Invalid hop ID" });
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      const isWalker = hop.walkerId === req.user.id;
      const isDriver = hop.driverId === req.user.id;
      if (!isWalker && !isDriver) return res.status(403).json({ message: "Not your hop" });
      if (isWalker) {
        await db.update(shortHops).set({ ratedByWalker: true }).where(eq(shortHops.id, hopId));
      } else {
        await db.update(shortHops).set({ ratedByDriver: true }).where(eq(shortHops.id, hopId));
      }
      res.json({ message: "Dismissed" });
    } catch {
      res.status(500).json({ message: "Failed to dismiss rating" });
    }
  });

  // Profile preferences
  app.put(api.profile.updatePreferences.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.profile.updatePreferences.input.parse(req.body);
      const user = await storage.updateUserPreferences(req.user.id, input);
      res.json(sanitizeUser(user));
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
      const allowed = ['driverConvoComfort', 'driverMusicPref', 'driverPetsOk', 'driverGroceriesOk', 'driverLifestyleTags', 'driverQuestionnaireCompleted', 'bio', 'interests', 'language', 'preferredRoutes', 'travelTime', 'favoritePlaces', 'profilePhoto', 'profileVisibility', 'legalName', 'profileColor', 'tipRatingOptOut', 'phone'];
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

  app.get('/api/free-ride-list', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const list = await storage.getFreeRideList(req.user.id);
      res.json(list);
    } catch {
      res.status(500).json({ message: "Failed to fetch free ride list" });
    }
  });

  app.post('/api/free-ride-list', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ message: "Username required" });
      const rider = await storage.getUserByUsername(username);
      if (!rider) return res.status(404).json({ message: "User not found" });
      if (rider.id === req.user.id) return res.status(400).json({ message: "Cannot add yourself" });
      const entry = await storage.addFreeRideUser(req.user.id, rider.id);
      res.json({ ...entry, username: rider.username });
    } catch (e: any) {
      if (e.message?.includes("duplicate") || e.code === '23505') {
        return res.status(409).json({ message: "User already in free ride list" });
      }
      res.status(500).json({ message: "Failed to add user" });
    }
  });

  app.delete('/api/free-ride-list/:riderId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const riderId = parseInt(req.params.riderId);
      if (isNaN(riderId)) return res.status(400).json({ message: "Invalid rider ID" });
      await storage.removeFreeRideUser(req.user.id, riderId);
      res.json({ message: "Removed" });
    } catch {
      res.status(500).json({ message: "Failed to remove user" });
    }
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
      const priceMap: Record<string, number> = { flex_hop: 700, power_hop: 1500 };
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

  app.post('/api/location', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { latitude, longitude, accuracy } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }
    liveLocations.set(req.user.id, { latitude, longitude, accuracy: accuracy || 0, updatedAt: Date.now() });

    try {
      const walkerHops = await storage.getHopsForWalker(req.user.id);
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const activeHop = [...walkerHops, ...driverHops].find(h => h.status === 'in_ride');
      if (activeHop) {
        await storage.appendGpsPoint(activeHop.id, req.user.id, latitude, longitude);

        const partnerId = activeHop.walkerId === req.user.id ? activeHop.driverId : activeHop.walkerId;
        if (partnerId) {
          const partnerLoc = liveLocations.get(partnerId);
          if (partnerLoc && Date.now() - partnerLoc.updatedAt < 120000) {
            const dist = getDistance(latitude, longitude, partnerLoc.latitude, partnerLoc.longitude);
            if (!activeHop.greenlight1 && dist < 0.15) {
              await storage.setGreenlight1(activeHop.id);
              await storage.logGpsEvent(activeHop.id, "greenlight1_triggered");
            }

            if (activeHop.greenlight1 && !activeHop.greenlight2 && activeHop.endLat && activeHop.endLng) {
              const destLat = parseFloat(String(activeHop.endLat));
              const destLng = parseFloat(String(activeHop.endLng));
              const myDistToDest = getDistance(latitude, longitude, destLat, destLng);
              const partnerDistToDest = getDistance(partnerLoc.latitude, partnerLoc.longitude, destLat, destLng);
              if (myDistToDest < 0.19 && partnerDistToDest < 0.19) {
                await storage.setGreenlight2(activeHop.id);
                await storage.logGpsEvent(activeHop.id, "greenlight2_triggered");
              }
            }

            if (!activeHop.leftBehindFlag && activeHop.rideStartedAt) {
              const rideAge = Date.now() - new Date(activeHop.rideStartedAt).getTime();
              const myAccuracy = accuracy || 999;
              if (rideAge > 90000 && dist > 0.5 && partnerLoc.accuracy < 50 && myAccuracy < 50) {
                await db.update(shortHops).set({
                  leftBehindFlag: true,
                  leftBehindAt: new Date(),
                }).where(eq(shortHops.id, activeHop.id));
                await storage.logGpsEvent(activeHop.id, "left_behind_flagged");
                console.log(`[SAFETY] Left-behind flagged for hop${activeHop.id} — distance: ${dist.toFixed(3)}mi, ride age: ${Math.round(rideAge / 1000)}s`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("GPS trip logging error:", err);
    }

    try {
      const driverUser = await storage.getUser(req.user.id);
      if (driverUser?.isDriver && driverUser.isActive) {
        const driverRoutes = await storage.getRoutes(req.user.id);
        if (driverRoutes.length > 0) {
          const route = driverRoutes[0];
          const destLat = parseFloat(route.endLat || "0");
          const destLng = parseFloat(route.endLng || "0");
          if (destLat && destLng) {
            const distToDest = getDistance(latitude, longitude, destLat, destLng);
            if (distToDest < 0.1) {
              const driverHops = await storage.getHopsForDriver(req.user.id);
              const hasActiveRide = driverHops.some((h: any) => h.status === "matched" || h.status === "in_ride");
              if (!hasActiveRide) {
                await storage.setDriverActive(req.user.id, false);
                liveLocations.delete(req.user.id);
                await db.delete(routineRoutes).where(eq(routineRoutes.driverId, req.user.id));
                console.log(`Driver ${req.user.id} auto-deactivated: reached destination (${distToDest.toFixed(3)}mi away)`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Auto-deactivate check error:", err);
    }

    res.json({ ok: true });
  });

  app.get('/api/hops/:id/tracking', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const walkerHops = await storage.getHopsForWalker(req.user.id);
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const hop = [...walkerHops, ...driverHops].find(h => h.id === hopId && (h.status === 'matched' || h.status === 'in_ride'));
      if (!hop) return res.status(404).json({ message: "No active hop" });

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

      let pickupSide: string | null = null;
      if (isWalker && hop.startLat && hop.startLng && hop.endLat && hop.endLng) {
        const driverBearingDeg = (() => {
          const lat1 = partnerLoc.latitude * Math.PI / 180;
          const lat2 = parseFloat(String(hop.startLat)) * Math.PI / 180;
          const dLon = (parseFloat(String(hop.startLng)) - partnerLoc.longitude) * Math.PI / 180;
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        })();

        if (driverBearingDeg >= 315 || driverBearingDeg < 45) pickupSide = "Stand on the EAST side of the road (driver coming from south)";
        else if (driverBearingDeg >= 45 && driverBearingDeg < 135) pickupSide = "Stand on the SOUTH side of the road (driver coming from west)";
        else if (driverBearingDeg >= 135 && driverBearingDeg < 225) pickupSide = "Stand on the WEST side of the road (driver coming from north)";
        else pickupSide = "Stand on the NORTH side of the road (driver coming from east)";
      }

      let etaMinutes: number | null = null;
      if (isWalker && hop.status === "matched" && hop.startLat && hop.startLng) {
        const pickupLat = parseFloat(String(hop.startLat));
        const pickupLng = parseFloat(String(hop.startLng));
        const driverToPickup = getDistance(partnerLoc.latitude, partnerLoc.longitude, pickupLat, pickupLng);
        const avgSpeedMph = 25;
        etaMinutes = Math.max(1, Math.round((driverToPickup / avgSpeedMph) * 60));
      }

      res.json({
        available: true,
        distance: distance !== null ? Math.round(distance * 100) / 100 : null,
        direction,
        partnerRole: isWalker ? "driver" : "walker",
        updatedAt: partnerLoc.updatedAt,
        partnerLat: partnerLoc.latitude,
        partnerLng: partnerLoc.longitude,
        pickupSide,
        hopStatus: hop.status,
        pickupLat: hop.startLat ? parseFloat(String(hop.startLat)) : null,
        pickupLng: hop.startLng ? parseFloat(String(hop.startLng)) : null,
        dropoffLat: hop.endLat ? parseFloat(String(hop.endLat)) : null,
        dropoffLng: hop.endLng ? parseFloat(String(hop.endLng)) : null,
        etaMinutes,
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
      const { days, startLocation, destination, timeStart, timeEnd, returnTrip, anytime, paymentPreference, role } = req.body;
      const scheduleRole = role === "driver" ? "driver" : "hopper";
      const isAnytime = anytime === true;
      if (!startLocation || !destination) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!isAnytime && (!days || !timeStart || !timeEnd)) {
        return res.status(400).json({ message: "Missing required fields for scheduled hop" });
      }
      if (scheduleRole === "hopper") {
        const currentUser = await storage.getUser(req.user.id);
        if (!currentUser) return res.status(404).json({ message: "User not found" });
        const hasPowerHop = currentUser.subscription === "power_hop" || currentUser.lifetimeSubscription;
        if (!hasPowerHop) {
          return res.status(403).json({ message: "PowerHop membership required to schedule hops", requiresPowerHop: true });
        }
      }
      const schedule = await storage.createSchedule({
        userId: req.user.id,
        days: isAnytime ? [] : days,
        startLocation,
        destination,
        timeStart: isAnytime ? null : timeStart,
        timeEnd: isAnytime ? null : timeEnd,
        returnTrip: returnTrip || false,
        active: true,
        anytime: isAnytime,
        paymentPreference: paymentPreference || "card",
        role: scheduleRole,
        paid: scheduleRole === "driver",
      } as any);
      res.json(schedule);
    } catch {
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  app.patch('/api/schedules/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { days, startLocation, destination, timeStart, timeEnd, returnTrip, active, anytime, paymentPreference } = req.body;
      const updates: Record<string, any> = {};
      if (days !== undefined) updates.days = days;
      if (startLocation !== undefined) updates.startLocation = startLocation;
      if (destination !== undefined) updates.destination = destination;
      if (timeStart !== undefined) updates.timeStart = timeStart;
      if (timeEnd !== undefined) updates.timeEnd = timeEnd;
      if (returnTrip !== undefined) updates.returnTrip = returnTrip;
      if (active !== undefined) updates.active = active;
      if (anytime !== undefined) updates.anytime = anytime;
      if (paymentPreference !== undefined) updates.paymentPreference = paymentPreference;
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

  app.post('/api/schedules/:id/pay', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const scheduleId = parseInt(req.params.id);
      if (isNaN(scheduleId)) return res.status(400).json({ message: "Invalid schedule ID" });
      const { distanceMiles } = req.body;
      const distance = Number(distanceMiles) || 5;

      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const allSchedules = await storage.getUserSchedules(req.user.id);
      const targetSchedule = allSchedules.find(s => s.id === scheduleId);
      if (!targetSchedule) return res.status(404).json({ message: "Schedule not found" });
      if ((targetSchedule as any).paid) return res.json({ paid: true, message: "Already paid" });

      const amountCents = Math.max(Math.round(distance * 100), 100);

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId: String(user.id), username: user.username },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customerId,
        confirm: true,
        metadata: {
          userId: String(req.user.id),
          scheduleId: String(scheduleId),
          type: 'scheduled_hop_payment',
        },
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });

      await storage.updateSchedule(scheduleId, req.user.id, { paid: true } as any);

      res.json({
        paymentIntentId: paymentIntent.id,
        amount: amountCents,
        paid: true,
      });
    } catch (e: any) {
      console.error('Schedule payment error:', e.message);
      res.status(500).json({ message: "Payment failed" });
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

  app.post('/api/hops/:id/driver-confirm-pickup', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "matched") return res.status(400).json({ message: "Hop must be in matched state" });
      if (hop.driverId !== req.user.id) return res.status(403).json({ message: "Only the driver can confirm pickup" });

      const driver = await storage.getUser(req.user.id);
      if (driver && (driver.falsePickupCount ?? 0) >= 5) {
        await db.update(users).set({ isDisabled: true, isActive: false }).where(eq(users.id, req.user.id));
        return res.status(403).json({ message: "Account deactivated due to repeated false pickup violations" });
      }

      await db.update(shortHops).set({
        driverConfirmedPickup: true,
        driverConfirmedPickupAt: new Date(),
      }).where(eq(shortHops.id, hopId));

      console.log(`[PICKUP] Driver ${req.user.id} confirmed pickup for hop${hopId}`);
      const updated = await storage.getHop(hopId);
      res.json(updated);
    } catch (err) {
      console.error("Driver confirm pickup error:", err);
      res.status(500).json({ message: "Failed to confirm pickup" });
    }
  });

  app.post('/api/hops/:id/hopper-confirm-pickup', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "matched") return res.status(400).json({ message: "Hop must be in matched state" });
      if (hop.walkerId !== req.user.id) return res.status(403).json({ message: "Only the hopper can confirm" });
      if (!hop.driverConfirmedPickup) return res.status(400).json({ message: "Driver has not confirmed pickup yet" });

      await db.update(shortHops).set({ hopperConfirmedPickup: true }).where(eq(shortHops.id, hopId));

      if (hop.paymentIntentId && hop.paymentStatus === "authorized" && !hop.paymentIntentId.startsWith("wheels_")) {
        try {
          const stripe = await getUncachableStripeClient();
          const pi = await stripe.paymentIntents.retrieve(hop.paymentIntentId);
          if (pi.status === "requires_capture") {
            await stripe.paymentIntents.capture(hop.paymentIntentId);
            await db.update(shortHops).set({ paymentStatus: "captured" }).where(eq(shortHops.id, hopId));
            console.log(`[PAYMENT] CAPTURED: PI ${hop.paymentIntentId} for hop${hopId} | hopper confirmed | $${(pi.amount / 100).toFixed(2)}`);
          }
        } catch (captureErr: any) {
          console.error(`[PAYMENT] CAPTURE FAILED: PI ${hop.paymentIntentId} for hop${hopId}:`, captureErr.message);
        }
      } else if (hop.paymentStatus === "wheels") {
        console.log(`[PAYMENT] WHEELS CONFIRMED: hop${hopId} | wheels already deducted at request time`);
      }

      const updated = await storage.startRide(hopId);

      if (hop.driverId) {
        try {
          await storage.createTripLog(hopId, hop.driverId, hop.walkerId);
          await storage.logGpsEvent(hopId, "ride_started");
        } catch (e) {
          console.error("Trip log creation error:", e);
        }
      }

      console.log(`[PICKUP] Hopper ${req.user.id} confirmed pickup for hop${hopId} — ride started`);
      res.json(updated);
    } catch (err) {
      console.error("Hopper confirm pickup error:", err);
      res.status(500).json({ message: "Failed to confirm pickup" });
    }
  });

  app.post('/api/hops/:id/false-pickup-violation', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id && hop.driverId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      if (!hop.driverConfirmedPickup || hop.hopperConfirmedPickup) {
        return res.status(400).json({ message: "Invalid state for false pickup violation" });
      }

      if (hop.driverId) {
        const newCount = ((await storage.getUser(hop.driverId))?.falsePickupCount ?? 0) + 1;
        await db.update(users).set({ falsePickupCount: newCount }).where(eq(users.id, hop.driverId));
        console.log(`[VIOLATION] False pickup for hop${hopId} by driver ${hop.driverId} — count: ${newCount}/5`);

        if (newCount >= 5) {
          await db.update(users).set({ isDisabled: true, isActive: false }).where(eq(users.id, hop.driverId));
          console.log(`[VIOLATION] Driver ${hop.driverId} BANNED — 5 false pickup violations reached`);
        }

        await db.update(shortHops).set({
          status: "cancelled",
          driverConfirmedPickup: false,
          hopperConfirmedPickup: false,
        }).where(eq(shortHops.id, hopId));

        res.json({ violations: newCount, banned: newCount >= 5 });
      } else {
        res.status(400).json({ message: "No driver assigned" });
      }
    } catch (err) {
      console.error("False pickup violation error:", err);
      res.status(500).json({ message: "Failed to record violation" });
    }
  });

  app.post('/api/hops/:id/hopper-left-behind', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id) return res.status(403).json({ message: "Only the hopper can report being left behind" });
      if (hop.status !== "in_ride") return res.status(400).json({ message: "Ride is not active" });

      const driverLoc = hop.driverId ? liveLocations.get(hop.driverId) : null;
      const hopperLoc = liveLocations.get(req.user.id);
      let gpsConfirmed = false;
      if (driverLoc && hopperLoc && Date.now() - driverLoc.updatedAt < 120000 && Date.now() - hopperLoc.updatedAt < 120000) {
        const dist = getDistance(hopperLoc.latitude, hopperLoc.longitude, driverLoc.latitude, driverLoc.longitude);
        gpsConfirmed = dist > 0.3;
      }

      if (!hop.leftBehindFlag) {
        return res.status(400).json({ message: "No left-behind alert detected for this ride" });
      }

      if (!gpsConfirmed) {
        return res.status(400).json({ message: "GPS shows you may still be near the driver. If you believe this is an error, please contact support." });
      }

      if (hop.paymentIntentId && !hop.paymentIntentId.startsWith("wheels_")) {
        try {
          const stripe = await getUncachableStripeClient();
          const pi = await stripe.paymentIntents.retrieve(hop.paymentIntentId);
          if (pi.status === "requires_capture") {
            await stripe.paymentIntents.cancel(hop.paymentIntentId);
            console.log(`[REFUND] Cancelled uncaptured PI ${hop.paymentIntentId} for hop${hopId} — left behind`);
          } else if (pi.status === "succeeded") {
            await stripe.refunds.create({ payment_intent: hop.paymentIntentId });
            console.log(`[REFUND] Refunded PI ${hop.paymentIntentId} for hop${hopId} — left behind`);
          }
          await db.update(shortHops).set({ paymentStatus: "refunded" }).where(eq(shortHops.id, hopId));
        } catch (refundErr: any) {
          console.error(`[REFUND] Failed for hop${hopId}:`, refundErr.message);
          return res.status(500).json({ message: "We couldn't process your refund automatically. Please contact support and we'll make it right." });
        }
      } else if (hop.paymentIntentId?.startsWith("wheels_")) {
        try {
          const wheelAmount = parseFloat(hop.paymentIntentId.replace("wheels_", "").split("_")[0] || "0");
          if (wheelAmount > 0 && hop.walkerId) {
            const hopper = await storage.getUser(hop.walkerId);
            const currentWheels = (hopper as any)?.wheels ?? 0;
            await db.update(users).set({ credits: currentWheels + wheelAmount }).where(eq(users.id, hop.walkerId));
            console.log(`[REFUND] Restored ${wheelAmount} wheels for hop${hopId} — left behind`);
          }
        } catch (wheelErr: any) {
          console.error(`[REFUND] Wheels restore failed for hop${hopId}:`, wheelErr.message);
        }
      }

      await db.update(shortHops).set({
        status: "cancelled",
        leftBehindFlag: true,
      }).where(eq(shortHops.id, hopId));
      await storage.logGpsEvent(hopId, "left_behind_confirmed_by_hopper");

      if (hop.driverId) {
        const driver = await storage.getUser(hop.driverId);
        const newStrikes = ((driver?.leftBehindStrikes ?? 0) + 1);
        await db.update(users).set({ leftBehindStrikes: newStrikes }).where(eq(users.id, hop.driverId));
        console.log(`[SAFETY] Left-behind strike for driver ${hop.driverId} — strikes: ${newStrikes}/3`);

        if (newStrikes >= 3) {
          await db.update(users).set({ isDisabled: true, isActive: false }).where(eq(users.id, hop.driverId));
          console.log(`[SAFETY] Driver ${hop.driverId} DEACTIVATED — 3 left-behind strikes`);
        }
      }

      res.json({ message: "We're sorry this happened. Your ride has been cancelled and you've been refunded." });
    } catch (err) {
      console.error("Left behind error:", err);
      res.status(500).json({ message: "Failed to process left-behind report" });
    }
  });

  app.post('/api/hops/:id/hopper-not-left-behind', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
      if (hop.status !== "in_ride") return res.status(400).json({ message: "Ride is not active" });
      await db.update(shortHops).set({ leftBehindFlag: false }).where(eq(shortHops.id, hopId));
      await storage.logGpsEvent(hopId, "left_behind_dismissed_by_hopper");
      const updated = await storage.getHop(hopId);
      res.json(updated);
    } catch (err) {
      console.error("Not left behind error:", err);
      res.status(500).json({ message: "Failed to dismiss" });
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

      if (!hop.driverConfirmedPickup || !hop.hopperConfirmedPickup) {
        return res.status(400).json({ message: "Both driver and hopper must confirm pickup first" });
      }

      if (hop.paymentIntentId && hop.paymentStatus === "authorized" && !hop.paymentIntentId.startsWith("wheels_")) {
        try {
          const stripe = await getUncachableStripeClient();
          const pi = await stripe.paymentIntents.retrieve(hop.paymentIntentId);
          if (pi.status === "requires_capture") {
            await stripe.paymentIntents.capture(hop.paymentIntentId);
            await db.update(shortHops).set({ paymentStatus: "captured" }).where(eq(shortHops.id, hopId));
            console.log(`[PAYMENT] CAPTURED: PI ${hop.paymentIntentId} for hop${hopId} | ride started | $${(pi.amount / 100).toFixed(2)}`);
          } else {
            console.log(`[PAYMENT] CAPTURE SKIPPED: PI ${hop.paymentIntentId} status=${pi.status} for hop${hopId}`);
          }
        } catch (captureErr: any) {
          console.error(`[PAYMENT] CAPTURE FAILED: PI ${hop.paymentIntentId} for hop${hopId}:`, captureErr.message);
        }
      } else if (hop.paymentStatus === "wheels") {
        console.log(`[PAYMENT] WHEELS CONFIRMED: hop${hopId} | wheels already deducted at request time`);
      }

      const updated = await storage.startRide(hopId);

      if (hop.driverId) {
        try {
          await storage.createTripLog(hopId, hop.driverId, hop.walkerId);
          await storage.logGpsEvent(hopId, "ride_started");
        } catch (e) {
          console.error("Trip log creation error:", e);
        }
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to start ride" });
    }
  });

  app.post('/api/hops/:id/auto-complete', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const [hop] = await db.select().from(shortHops).where(eq(shortHops.id, hopId));
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "in_ride") return res.status(400).json({ message: "Hop must be in_ride to auto-complete" });
      if (hop.walkerId !== req.user.id && hop.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not your hop" });
      }

      const isHopper = hop.walkerId === req.user.id;
      const isDriver = hop.driverId === req.user.id;

      if (isHopper) {
        await db.update(shortHops).set({ hopperConfirmedComplete: true }).where(eq(shortHops.id, hopId));
      }
      if (isDriver) {
        await db.update(shortHops).set({ driverConfirmedComplete: true }).where(eq(shortHops.id, hopId));
      }

      const [refreshed] = await db.select().from(shortHops).where(eq(shortHops.id, hopId));
      if (refreshed.driverConfirmedComplete && refreshed.hopperConfirmedComplete && refreshed.driverId) {
        const completed = await finalizeHopCompletion(hopId, refreshed.driverId);
        return res.json({ ...completed, bothConfirmed: true });
      }

      console.log(`[RIDE] AUTO-COMPLETE partial: hop${hopId} | by=${isHopper ? 'hopper' : 'driver'} | driverConfirmed=${refreshed.driverConfirmedComplete} | hopperConfirmed=${refreshed.hopperConfirmedComplete}`);
      res.json({ ...refreshed, bothConfirmed: false });
    } catch (err) {
      res.status(500).json({ message: "Failed to auto-complete ride" });
    }
  });

  app.post('/api/hops/:id/ss-request', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "in_ride") return res.status(400).json({ message: "Must be in ride" });
      if (hop.walkerId !== req.user.id) return res.status(403).json({ message: "Only hopper can request SS" });

      const existing = await db.select().from(spontaneousStops).where(
        and(
          eq(spontaneousStops.hopId, hopId),
          sql`${spontaneousStops.status} IN ('requested', 'approved', 'active')`
        )
      );
      if (existing.length > 0) return res.status(400).json({ message: "SS already pending or in progress" });

      const [stop] = await db.insert(spontaneousStops).values({
        hopId,
        hopperId: hop.walkerId,
        driverId: hop.driverId!,
        status: "requested",
        baseFee: 200,
        extraMinutesFee: 0,
      }).returning();

      res.json(stop);
    } catch (err) {
      res.status(500).json({ message: "Failed to request SS" });
    }
  });

  app.post('/api/hops/:id/ss-approve', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.driverId !== req.user.id) return res.status(403).json({ message: "Only driver can approve SS" });

      const [stop] = await db.select().from(spontaneousStops).where(
        and(eq(spontaneousStops.hopId, hopId), eq(spontaneousStops.status, "requested"))
      );
      if (!stop) return res.status(404).json({ message: "No pending SS request" });

      const [updated] = await db.update(spontaneousStops)
        .set({ status: "approved" })
        .where(eq(spontaneousStops.id, stop.id))
        .returning();

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve SS" });
    }
  });

  app.post('/api/hops/:id/ss-deny', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.driverId !== req.user.id) return res.status(403).json({ message: "Only driver can deny SS" });

      const [stop] = await db.select().from(spontaneousStops).where(
        and(eq(spontaneousStops.hopId, hopId), eq(spontaneousStops.status, "requested"))
      );
      if (!stop) return res.status(404).json({ message: "No pending SS request" });

      const [updated] = await db.update(spontaneousStops)
        .set({ status: "denied" })
        .where(eq(spontaneousStops.id, stop.id))
        .returning();

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to deny SS" });
    }
  });

  app.post('/api/hops/:id/ss-arrive', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.driverId !== req.user.id) return res.status(403).json({ message: "Only driver can mark arrival" });

      const [stop] = await db.select().from(spontaneousStops).where(
        and(eq(spontaneousStops.hopId, hopId), eq(spontaneousStops.status, "approved"))
      );
      if (!stop) return res.status(404).json({ message: "No approved SS" });

      const [updated] = await db.update(spontaneousStops)
        .set({ status: "active", driverArrivedAt: new Date() })
        .where(eq(spontaneousStops.id, stop.id))
        .returning();

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to mark SS arrival" });
    }
  });

  app.post('/api/hops/:id/ss-complete', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.driverId !== req.user.id && hop.walkerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [stop] = await db.select().from(spontaneousStops).where(
        and(eq(spontaneousStops.hopId, hopId), eq(spontaneousStops.status, "active"))
      );
      if (!stop) return res.status(404).json({ message: "No active SS" });

      let extraFee = 0;
      if (stop.driverArrivedAt) {
        const elapsedMs = Date.now() - new Date(stop.driverArrivedAt).getTime();
        const elapsedMinutes = elapsedMs / 60000;
        if (elapsedMinutes > 3) {
          const extraMinutes = Math.ceil(elapsedMinutes - 3);
          extraFee = extraMinutes * 50;
        }
      }

      const [updated] = await db.update(spontaneousStops)
        .set({ status: "completed", completedAt: new Date(), extraMinutesFee: extraFee })
        .where(eq(spontaneousStops.id, stop.id))
        .returning();

      const totalSsFee = 200 + extraFee;
      const currentPrice = hop.priceCents || 0;
      await db.update(shortHops)
        .set({ priceCents: currentPrice + totalSsFee })
        .where(eq(shortHops.id, hopId));

      let ssFeeCharged = false;
      if (hop.walkerId && totalSsFee > 0) {
        if (hop.paymentIntentId?.startsWith("wheels_")) {
          const walker = await storage.getUser(hop.walkerId);
          if (walker && (walker.riderCredits || 0) >= totalSsFee / 100) {
            await db.update(users).set({ riderCredits: (walker.riderCredits || 0) - totalSsFee / 100 }).where(eq(users.id, hop.walkerId));
            if (hop.driverId) {
              await storage.addDriverEarnings(hop.driverId, totalSsFee / 100, "ss_earning", `SS fee from hop#${hopId} (wheels)`, hopId);
            }
            ssFeeCharged = true;
            console.log(`[PAYMENT] SS FEE WHEELS: ${(totalSsFee / 100).toFixed(2)} wheels charged to user${hop.walkerId} for hop${hopId} SS stop`);
          }
        } else {
          try {
            const walker = await storage.getUser(hop.walkerId);
            if (walker?.stripeCustomerId) {
              const stripe = await getUncachableStripeClient();
              const paymentMethods = await stripe.paymentMethods.list({ customer: walker.stripeCustomerId, type: 'card' });
              if (paymentMethods.data.length > 0) {
                const ssPi = await stripe.paymentIntents.create({
                  amount: totalSsFee,
                  currency: 'usd',
                  customer: walker.stripeCustomerId,
                  payment_method: paymentMethods.data[0].id,
                  off_session: true,
                  confirm: true,
                  metadata: {
                    userId: String(hop.walkerId),
                    type: 'ss_fee',
                    hopId: String(hopId),
                    driverId: String(hop.driverId),
                    baseFee: '200',
                    extraFee: String(extraFee),
                  },
                  automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
                });
                if (ssPi.status === 'succeeded') {
                  if (hop.driverId) {
                    await storage.addDriverEarnings(hop.driverId, totalSsFee / 100, "ss_earning", `SS fee from hop#${hopId} (card)`, hopId, ssPi.id);
                  }
                  ssFeeCharged = true;
                  console.log(`[PAYMENT] SS FEE CARD: PI ${ssPi.id} $${(totalSsFee / 100).toFixed(2)} charged to user${hop.walkerId} for hop${hopId} SS stop`);
                }
              }
            }
          } catch (ssChargeErr: any) {
            console.error(`[PAYMENT] SS FEE CHARGE FAILED: hop${hopId}:`, ssChargeErr.message);
          }
        }
      }

      res.json({ ...updated, ssFeeCharged, totalSsFee });
    } catch (err) {
      res.status(500).json({ message: "Failed to complete SS" });
    }
  });

  app.get('/api/hops/:id/ss-status', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const stops = await db.select().from(spontaneousStops)
        .where(eq(spontaneousStops.hopId, hopId))
        .orderBy(desc(spontaneousStops.createdAt))
        .limit(1);

      if (stops.length === 0) return res.json({ active: false });

      const stop = stops[0];
      let elapsedSeconds = 0;
      let extraFee = 0;
      if (stop.driverArrivedAt && (stop.status === "active")) {
        elapsedSeconds = Math.floor((Date.now() - new Date(stop.driverArrivedAt).getTime()) / 1000);
        const elapsedMinutes = elapsedSeconds / 60;
        if (elapsedMinutes > 3) {
          extraFee = Math.ceil(elapsedMinutes - 3) * 50;
        }
      }

      const isLive = stop.status === "requested" || stop.status === "approved" || stop.status === "active";
      const recentlyDenied = stop.status === "denied" && stop.createdAt && (Date.now() - new Date(stop.createdAt).getTime() < 30000);

      res.json({
        active: isLive || recentlyDenied,
        stop: {
          ...stop,
          elapsedSeconds,
          currentExtraFee: extraFee,
          totalFee: 200 + extraFee,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to get SS status" });
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

  app.get('/api/driver/routine-routes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const routes = await storage.getRoutes(req.user.id);
      res.json(routes);
    } catch {
      res.status(500).json({ message: "Failed to get routine routes" });
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
    const { active, startLat, startLng, endLat, endLng, startLocation, endLocation } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ message: "Invalid request" });

    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isDriver) return res.status(403).json({ message: "Not a registered driver" });
      if (!user?.driverVerified && active) return res.status(403).json({ message: "Driver not verified yet" });
      if (user?.isDisabled) return res.status(403).json({ message: "Account disabled" });
      if (!user?.profilePhoto && active) return res.status(403).json({ message: "Profile photo required to go active. Hoppers need to see who they're riding with!" });

      const updated = await storage.setDriverActive(req.user.id, active);

      if (active) {
        const lat = parseFloat(startLat) || 38.0406;
        const lng = parseFloat(startLng) || -84.5037;
        liveLocations.set(req.user.id, {
          latitude: lat,
          longitude: lng,
          accuracy: 10,
          updatedAt: Date.now(),
        });

        if (endLat && endLng) {
          await db.delete(routineRoutes).where(eq(routineRoutes.driverId, req.user.id));
          await db.insert(routineRoutes).values({
            driverId: req.user.id,
            name: "Active Route",
            startLocation: startLocation || "Current Location",
            endLocation: endLocation || "Destination",
            startLat: String(lat),
            startLng: String(lng),
            endLat: String(endLat),
            endLng: String(endLng),
            startTime: "00:00",
            endTime: "23:59",
            days: JSON.stringify(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
          });
          console.log(`Driver ${req.user.id} active route saved: (${lat},${lng}) → (${endLat},${endLng})`);
        }

        tryAutoMatchForDriver(req.user.id);
      } else {
        liveLocations.delete(req.user.id);
        await db.delete(routineRoutes).where(eq(routineRoutes.driverId, req.user.id));

        const driverHops = await storage.getHopsForDriver(req.user.id);
        for (const hop of driverHops) {
          if (hop.status === "matched" || hop.status === "in_ride") {
            await db.update(shortHops)
              .set({
                status: "requested",
                driverId: null,
                driverConfirmedPickup: false,
                hopperConfirmedPickup: false,
                driverConfirmedPickupAt: null,
              })
              .where(eq(shortHops.id, hop.id));

            if (hop.walkerId) {
              await storage.createNotification({
                userId: hop.walkerId,
                type: "driver_cancelled",
                title: "Driver Unavailable",
                message: "Your driver had to step away — hang tight, we're finding you another ride!",
                isRead: false,
              });
            }

            console.log(`Driver ${req.user.id} went offline — hop ${hop.id} returned to matching queue (was ${hop.status})`);
          }
        }
      }

      res.json({ success: true, isActive: active });
    } catch (e: any) {
      console.error('Driver active toggle error:', e.message);
      res.status(500).json({ message: "Failed to toggle active status" });
    }
  });

  app.get('/api/hops/:id/driver-info', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hops = await storage.getHopsForWalker(req.user.id);
      const hop = hops.find(h => h.id === hopId && (h.status === 'matched' || h.status === 'in_ride'));
      if (!hop || !hop.driverId) return res.json(null);
      const driver = await storage.getUser(hop.driverId);
      if (!driver) return res.json(null);
      res.json({
        username: driver.username,
        profilePhoto: driver.profilePhoto,
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
        subscription: driver.subscription,
        profileColor: driver.profileColor || "text-orange-500",
        favoritePlaces: driver.favoritePlaces,
        travelTime: driver.travelTime,
        city: driver.city,
        totalHops: driver.totalHops,
        idVerified: driver.idVerified,
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

  app.get('/api/download/source', requireAdmin, (_req, res) => {
    const filePath = path.resolve(process.cwd(), 'client/public/shorthop-source.zip');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Source archive not found' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=shorthop-source.zip');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  });

  app.get('/api/download/msix', requireAdmin, (_req, res) => {
    const filePath = path.resolve(process.cwd(), 'client/public/ShortHop-Microsoft-Store.msix');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'MSIX package not found' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=ShortHop-Microsoft-Store.msix');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  });

  app.get('/api/download/ipa', requireAdmin, (_req, res) => {
    const filePath = path.resolve(process.cwd(), 'client/public/ShortHop-iOS.ipa');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'IPA package not found' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=ShortHop-iOS.ipa');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  });

  app.get('/api/download/expo', requireAdmin, (_req, res) => {
    const filePath = path.resolve(process.cwd(), 'client/public/ShortHop-Expo-iOS.zip');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Expo project not found' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=ShortHop-Expo-iOS.zip');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  });

  app.get('/api/download/aab', requireAdmin, (_req, res) => {
    const filePath = path.resolve(process.cwd(), 'client/public/ShortHop-Android.aab');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'AAB package not found' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=ShortHop-Android.aab');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  });

  app.get('/api/download/apk', requireAdmin, (_req, res) => {
    const filePath = path.resolve(process.cwd(), 'client/public/ShortHop-Android.apk');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'APK package not found' });
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename=ShortHop-Android.apk');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  });

  app.post('/api/admin/force-cancel-hop/:id', requireAdmin, async (req, res) => {
    try {
      const hopId = Number(req.params.id);
      await db.update(shortHops).set({ status: "cancelled", paymentStatus: "refunded" }).where(eq(shortHops.id, hopId));
      pendingAdditionalHops.delete(hopId);
      console.log(`Admin force-cancelled hop ${hopId}`);
      res.json({ ok: true, hopId });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/admin/photo', async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const admin = allUsers.find(u => u.username?.toLowerCase() === "hyperfm");
      if (admin?.profilePhoto) {
        return res.json({ profilePhoto: admin.profilePhoto, username: admin.username });
      }
      res.json({ profilePhoto: null, username: null });
    } catch {
      res.json({ profilePhoto: null, username: null });
    }
  });

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
        isFirstTenDriver: d.isFirstTenDriver,
        availableSeats: d.availableSeats,
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

      if (status === "approved") {
        const approvedCount = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.driverVerified, true));
        const totalApproved = Number(approvedCount[0]?.count || 0);
        const isFirstTen = totalApproved <= 10;

        if (isFirstTen) {
          await db.update(users).set({ isFirstTenDriver: true }).where(eq(users.id, application.userId));
        }

        const firstTenLine = isFirstTen
          ? "\n\nYou're also part of our first 10 drivers, helping shape how this system grows in Lexington."
          : "";

        const approvalMsg = `🎉 You're approved as a ShortHop driver.${firstTenLine}\n\nTo make sure your experience is smooth, you'll have direct access to the founder during this early phase. If anything feels off, confusing, or could be improved—even slightly—reach out anytime.\n\nYou're not just driving, you're helping build this.`;

        await storage.createNotification({
          userId: application.userId,
          type: "driver_mode",
          title: "Driver Approved! 🎉",
          message: approvalMsg,
          isRead: false,
        });
      } else {
        await storage.createNotification({
          userId: application.userId,
          type: "driver_mode",
          title: "Application Update",
          message: `Your driver application was not approved. ${notes || "Please contact support for more info."}`,
          isRead: false,
        });
      }

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

  app.post('/api/admin/users/:id/first-ten-driver', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { value } = req.body;
      await db.update(users).set({ isFirstTenDriver: !!value }).where(eq(users.id, userId));
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to toggle first ten driver" });
    }
  });

  app.post('/api/user/driver-approval-seen', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      await db.update(users).set({ driverApprovalSeen: true }).where(eq(users.id, req.user.id));
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to mark approval seen" });
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

  app.get('/api/saved-routes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const routes = await storage.getSavedRoutes(req.user.id);
      res.json(routes);
    } catch (err) {
      res.status(500).json({ message: "Failed to get saved routes" });
    }
  });

  app.post('/api/saved-routes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { name, address, lat, lng } = req.body;
      if (!name || !address) return res.status(400).json({ message: "Name and address required" });
      const route = await storage.createSavedRoute({ userId: req.user.id, name, address, lat, lng });
      res.json(route);
    } catch (err) {
      res.status(500).json({ message: "Failed to create saved route" });
    }
  });

  app.put('/api/saved-routes/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const route = await storage.updateSavedRoute(id, req.user.id, req.body);
      res.json(route);
    } catch (err) {
      res.status(500).json({ message: "Failed to update saved route" });
    }
  });

  app.delete('/api/saved-routes/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSavedRoute(id, req.user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete saved route" });
    }
  });

  app.post('/api/saved-routes/:id/confirm', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      await storage.incrementSavedRouteConfirm(id, req.user!.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to confirm route" });
    }
  });

  app.get('/api/star-hoppers', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const stars = await storage.getStarHoppers(req.user!.id);
      const enriched = await Promise.all(stars.map(async (s) => {
        const u = await storage.getUser(s.starUserId);
        return {
          id: s.id,
          starUserId: s.starUserId,
          username: u?.username || "Unknown",
          isDriver: u?.isDriver || false,
          idVerified: u?.idVerified || false,
          createdAt: s.createdAt,
        };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to load star hoppers" });
    }
  });

  app.post('/api/star-hoppers', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { starUserId } = req.body;
      if (!starUserId) return res.status(400).json({ message: "Star user ID required" });
      if (starUserId === req.user!.id) return res.status(400).json({ message: "Cannot star yourself" });
      const starUser = await storage.getUser(starUserId);
      if (!starUser) return res.status(404).json({ message: "User not found" });
      const star = await storage.addStarHopper(req.user!.id, starUserId);
      res.json({ ...star, username: starUser.username });
    } catch (err) {
      res.status(500).json({ message: "Failed to add star hopper" });
    }
  });

  app.delete('/api/star-hoppers/:starUserId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const starUserId = parseInt(req.params.starUserId);
      await storage.removeStarHopper(req.user!.id, starUserId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to remove star hopper" });
    }
  });

  app.get('/api/star-hoppers/search', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const query = (req.query.q as string || "").trim().toLowerCase();
      if (query.length < 2) return res.json([]);
      const allUsers = await db.select({ id: users.id, username: users.username, isDriver: users.isDriver, idVerified: users.idVerified }).from(users).where(sql`LOWER(${users.username}) LIKE ${`%${query}%`}`).limit(10);
      const myStars = await storage.getStarHopperUserIds(req.user!.id);
      const myStarSet = new Set(myStars);
      const results = allUsers.filter(u => u.id !== req.user!.id).map(u => ({
        id: u.id,
        username: u.username,
        isDriver: u.isDriver,
        idVerified: u.idVerified,
        isStarred: myStarSet.has(u.id),
      }));
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.post('/api/refund-request', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { hopId, reason } = req.body;
      if (!hopId || !reason) return res.status(400).json({ message: "Hop ID and reason required" });

      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id) return res.status(403).json({ message: "Not your hop" });
      if (hop.status !== "completed" && hop.status !== "cancelled") {
        return res.status(400).json({ message: "Can only request refund for completed or cancelled rides" });
      }

      const existing = await storage.getRefundRequest(hopId);
      if (existing) return res.status(400).json({ message: "Refund request already submitted for this trip" });

      const tripLog = await storage.getTripLog(hopId);
      const gl1 = tripLog?.greenlight1 || hop.greenlight1 || false;
      const gl2 = tripLog?.greenlight2 || hop.greenlight2 || false;
      const gpsOk = tripLog?.gpsComplete !== false && hop.gpsComplete !== false;

      const aiResponse = "Thank you for reaching out! I understand this can be frustrating. " +
        "Our team will carefully review your trip details, including GPS data and route information, " +
        "to ensure a fair resolution. You'll receive an update within 48–72 hours. " +
        "We appreciate your patience and want to make sure we get this right for you.";

      const refundReq = await storage.createRefundRequest(hopId, req.user.id, reason, aiResponse, gl1, gl2, gpsOk);
      res.json({ ...refundReq, aiMessage: aiResponse });
    } catch (err) {
      res.status(500).json({ message: "Failed to submit refund request" });
    }
  });

  app.get('/api/refund-requests', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const walkerHops = await storage.getHopsForWalker(req.user.id);
      const hopIds = new Set(walkerHops.map(h => h.id));
      const allRequests = await storage.getRefundRequests();
      const myRequests = allRequests.filter(r => r.userId === req.user.id || hopIds.has(r.hopId));
      res.json(myRequests);
    } catch (err) {
      res.status(500).json({ message: "Failed to load refund requests" });
    }
  });

  app.get('/api/hops/:id/trip-log', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id && hop.driverId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not your hop" });
      }
      const log = await storage.getTripLog(hopId);
      res.json(log || { message: "No trip log available" });
    } catch (err) {
      res.status(500).json({ message: "Failed to load trip log" });
    }
  });

  app.post('/api/hops/:id/report-gps-off', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.id);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.walkerId !== req.user.id && hop.driverId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not your hop" });
      }
      await storage.setGpsIncomplete(hopId);
      await storage.logGpsEvent(hopId, "gps_disabled_by_user");
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to report GPS" });
    }
  });

  app.post('/api/support-chat', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });

      const lowerMsg = message.toLowerCase();

      let response = "";
      if (lowerMsg.includes("refund") || lowerMsg.includes("money back") || lowerMsg.includes("charge")) {
        response = "I understand you have a concern about a charge. I'd love to help! " +
          "Could you tell me which ride this is about and what happened? " +
          "Once I have more details, our team will review the trip data and get back to you within 48–72 hours with a resolution.";
      } else if (lowerMsg.includes("driver") || lowerMsg.includes("unsafe") || lowerMsg.includes("safety")) {
        response = "Your safety is our top priority. I'm sorry to hear about this experience. " +
          "Could you provide a few more details about what happened? " +
          "Our safety team will review this and follow up with you within 48–72 hours.";
      } else if (lowerMsg.includes("cancel") || lowerMsg.includes("cancelled")) {
        response = "I see you have a question about a cancellation. " +
          "Cancellations before a match are fully refunded. For rides that were already in progress, " +
          "our team reviews the trip data to determine the appropriate outcome. " +
          "Is there a specific trip you'd like help with?";
      } else if (lowerMsg.includes("how") || lowerMsg.includes("work") || lowerMsg.includes("what is")) {
        response = "Great question! ShortHop is a community-based platform that connects people heading in the same direction. " +
          "Drivers share their regular routes and get matched with hoppers going the same way. " +
          "It's convenient, affordable, and built on trust. Is there something specific you'd like to know more about?";
      } else {
        response = "Thanks for reaching out! I'm here to help. " +
          "Could you tell me a bit more about what you need assistance with? " +
          "Whether it's about a ride, your account, or anything else, I'm happy to guide you.";
      }

      res.json({ response });
    } catch (err) {
      res.status(500).json({ message: "Support unavailable" });
    }
  });

  app.patch('/api/user/match-preference', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (!req.user.isDriver) return res.status(403).json({ message: "Drivers only" });
    try {
      const { matchPreference } = req.body;
      if (!matchPreference || !["one_rider", "maximize_seats"].includes(matchPreference)) {
        return res.status(400).json({ message: "Invalid preference" });
      }
      await storage.updateUser(req.user.id, { matchPreference });
      res.json({ success: true, matchPreference });
    } catch (err) {
      res.status(500).json({ message: "Failed to update preference" });
    }
  });

  app.get('/api/driver/pending-hoppers', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const pending: any[] = [];
      for (const [hopId, data] of pendingAdditionalHops.entries()) {
        if (data.driverId === req.user.id) {
          if (Date.now() - data.createdAt > 120000) {
            pendingAdditionalHops.delete(hopId);
            continue;
          }
          pending.push(data);
        }
      }
      res.json(pending);
    } catch (err) {
      res.status(500).json({ message: "Failed to get pending hoppers" });
    }
  });

  app.post('/api/driver/pending-hoppers/:hopId/accept', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.hopId);
      const pending = pendingAdditionalHops.get(hopId);
      if (!pending || pending.driverId !== req.user.id) {
        return res.status(404).json({ message: "No pending request found" });
      }
      const hop = await storage.getHop(hopId);
      if (!hop || hop.status !== "requested") {
        pendingAdditionalHops.delete(hopId);
        return res.status(400).json({ message: "Hop no longer available" });
      }
      if (hop.walkerId === req.user.id) {
        pendingAdditionalHops.delete(hopId);
        return res.status(400).json({ message: "You cannot accept your own hop request" });
      }
      const driver = await storage.getUser(req.user.id);
      if (!driver) {
        pendingAdditionalHops.delete(hopId);
        return res.status(400).json({ message: "Driver not found" });
      }
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const activeSeatsUsed = driverHops
        .filter((h: any) => h.status === "matched" || h.status === "in_ride")
        .reduce((sum: number, h: any) => sum + (h.seatsNeeded || 1), 0);
      const effectiveSeats = (driver.availableSeats || 1) - activeSeatsUsed;
      if ((hop.seatsNeeded || 1) > effectiveSeats) {
        pendingAdditionalHops.delete(hopId);
        return res.status(400).json({ message: "Not enough seats available" });
      }
      await executeMatch(hopId, req.user.id, false, hop);
      pendingAdditionalHops.delete(hopId);
      res.json({ message: "Hopper accepted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to accept hopper" });
    }
  });

  app.post('/api/driver/pending-hoppers/:hopId/decline', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.hopId);
      const pending = pendingAdditionalHops.get(hopId);
      if (!pending || pending.driverId !== req.user.id) {
        return res.status(404).json({ message: "No pending request found" });
      }
      pendingAdditionalHops.delete(hopId);
      res.json({ message: "Hopper declined" });
    } catch (err) {
      res.status(500).json({ message: "Failed to decline hopper" });
    }
  });

  app.get('/api/driver/stop-order', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const driverHops = await storage.getHopsForDriver(req.user.id);
      const activeHops = driverHops.filter((h: any) => h.status === "matched" || h.status === "in_ride");
      if (activeHops.length === 0) return res.json({ stops: [] });

      const driverLoc = liveLocations.get(req.user.id);
      if (!driverLoc || Date.now() - driverLoc.updatedAt > 120000) {
        return res.json({ stops: activeHops.map((h: any) => ({ hopId: h.id, type: h.status === "matched" ? "pickup" : "dropoff", lat: parseFloat(h.status === "matched" ? h.startLat : h.endLat), lng: parseFloat(h.status === "matched" ? h.startLng : h.endLng) })) });
      }

      const routes = await storage.getRoutes(req.user.id);
      let destLat = driverLoc.latitude, destLng = driverLoc.longitude;
      if (routes.length > 0) {
        destLat = parseFloat(routes[0].endLat || "0") || driverLoc.latitude;
        destLng = parseFloat(routes[0].endLng || "0") || driverLoc.longitude;
      }

      const stops = orderStopsAlongRoute(driverLoc.latitude, driverLoc.longitude, destLat, destLng, activeHops as any);
      res.json({ stops });
    } catch {
      res.status(500).json({ message: "Failed to get stop order" });
    }
  });

  app.get('/api/ride-chat/:hopId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.hopId);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "matched" && hop.status !== "in_ride") {
        return res.status(400).json({ message: "Chat only available during active rides" });
      }
      if (!hop.driverId || (hop.walkerId !== req.user.id && hop.driverId !== req.user.id)) {
        return res.status(403).json({ message: "Not your ride" });
      }
      const messages = await storage.getRideMessages(hopId);
      const enriched = await Promise.all(messages.map(async (m) => {
        const sender = await storage.getUser(m.senderId);
        return { ...m, senderUsername: sender?.username || "Unknown" };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to load messages" });
    }
  });

  app.post('/api/ride-chat/:hopId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopId = Number(req.params.hopId);
      const hop = await storage.getHop(hopId);
      if (!hop) return res.status(404).json({ message: "Hop not found" });
      if (hop.status !== "matched" && hop.status !== "in_ride") {
        return res.status(400).json({ message: "Chat only available during active rides" });
      }
      if (!hop.driverId || (hop.walkerId !== req.user.id && hop.driverId !== req.user.id)) {
        return res.status(403).json({ message: "Not your ride" });
      }
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createRideMessage(hopId, req.user.id, message.trim());

      const recipientId = req.user.id === hop.walkerId ? hop.driverId : hop.walkerId;
      if (recipientId) {
        await storage.createNotification({
          userId: recipientId,
          type: "message",
          title: "New message",
          message: `${req.user.username}: ${message.trim().slice(0, 80)}`,
        });
      }

      res.json(msg);
    } catch (err) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/admin/refund-requests', async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.status(401).json({ message: "Unauthorized" });
    try {
      const requests = await storage.getRefundRequests();
      const enriched = await Promise.all(requests.map(async (r) => {
        const user = await storage.getUser(r.userId);
        const hop = await storage.getHop(r.hopId);
        const tripLog = await storage.getTripLog(r.hopId);
        return {
          ...r,
          username: user?.username || "Unknown",
          hopDetails: hop ? { startLocation: hop.startLocation, endLocation: hop.endLocation, distanceMiles: hop.distanceMiles, priceCents: hop.priceCents, status: hop.status } : null,
          tripLog: tripLog || null,
        };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to load refund requests" });
    }
  });

  app.post('/api/admin/refund-requests/:id/resolve', async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { status, adminNotes } = req.body;
      if (!status || !["approved", "denied", "partial"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const allRequests = await storage.getRefundRequests();
      const existing = allRequests.find(r => r.id === Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Refund request not found" });
      if (existing.status !== "pending") {
        return res.status(400).json({ message: "This refund request has already been resolved" });
      }
      const resolved = await storage.resolveRefundRequest(Number(req.params.id), status, adminNotes || "");

      if (status === "approved" && resolved.hopId) {
        const hop = await storage.getHop(resolved.hopId);
        if (hop?.paymentIntentId) {
          try {
            const stripe = await getUncachableStripeClient();
            await stripe.refunds.create({ payment_intent: hop.paymentIntentId });
            await db.update(shortHops).set({ paymentStatus: "refunded" }).where(eq(shortHops.id, hop.id));
          } catch (e: any) {
            console.error("Refund processing error:", e.message);
          }
        }
      } else if (status === "partial" && resolved.hopId) {
        const hop = await storage.getHop(resolved.hopId);
        if (hop?.paymentIntentId && hop.paymentAmountCents) {
          try {
            const stripe = await getUncachableStripeClient();
            const partialAmount = Math.round(hop.paymentAmountCents * 0.5);
            await stripe.refunds.create({ payment_intent: hop.paymentIntentId, amount: partialAmount });
            await db.update(shortHops).set({ paymentStatus: "partial_refund" }).where(eq(shortHops.id, hop.id));
          } catch (e: any) {
            console.error("Partial refund error:", e.message);
          }
        }
      }

      await storage.createNotification({
        userId: resolved.userId,
        type: "system",
        title: status === "approved" ? "Refund Approved" : status === "partial" ? "Partial Refund Issued" : "Refund Request Update",
        message: status === "approved"
          ? "Your refund request has been approved. The full amount will be returned to your payment method."
          : status === "partial"
          ? "After reviewing your trip, a partial refund (50%) has been issued to your payment method."
          : "After reviewing your trip data, we were unable to process a refund for this ride. If you have questions, please reach out to support.",
        isRead: false,
      });

      res.json(resolved);
    } catch (err) {
      res.status(500).json({ message: "Failed to resolve request" });
    }
  });

  app.post('/api/activity-window', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { dayOfWeek, startHour, endHour } = req.body;
      const window = await storage.upsertActivityWindow(req.user!.id, dayOfWeek, startHour, endHour);
      res.json(window);
    } catch (err) {
      res.status(500).json({ message: "Failed to update activity window" });
    }
  });

  app.get('/api/activity-windows', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const windows = await storage.getUserActivityWindows(req.user!.id);
      res.json(windows);
    } catch (err) {
      res.status(500).json({ message: "Failed to load activity windows" });
    }
  });

  app.post('/api/id-verification/submit', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { idPhoto, idSelfie } = req.body;
      if (!idPhoto || !idSelfie) {
        return res.status(400).json({ message: "Both ID photo and selfie are required" });
      }
      if (idPhoto.length > 2000000 || idSelfie.length > 2000000) {
        return res.status(400).json({ message: "Images too large. Please use smaller photos." });
      }
      const currentUser = await storage.getUser(req.user!.id);
      if (currentUser?.idVerified) {
        return res.status(400).json({ message: "Already verified" });
      }
      if (currentUser?.idVerificationStatus === "pending") {
        return res.status(400).json({ message: "Verification already submitted and pending review" });
      }
      await db.update(users).set({
        idPhoto,
        idSelfie,
        idVerificationStatus: "pending",
        idSubmittedAt: new Date(),
      }).where(eq(users.id, req.user!.id));
      const todayCount = await storage.getNotificationCountToday(req.user!.id);
      if (todayCount < 5) {
        await storage.createNotification({
          userId: req.user!.id,
          type: "system",
          title: "ID Verification Submitted ✅",
          message: "Your ID verification is under review. You'll be notified once it's approved.",
          isRead: false,
        });
      }
      res.json({ status: "pending", message: "Verification submitted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to submit verification" });
    }
  });

  app.get('/api/id-verification/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = await storage.getUser(req.user!.id);
      res.json({
        idVerified: user?.idVerified || false,
        status: user?.idVerificationStatus || "none",
        submittedAt: user?.idSubmittedAt || null,
      });
    } catch {
      res.status(500).json({ message: "Failed to get verification status" });
    }
  });

  app.get('/api/admin/id-verifications', requireAdmin, async (_req, res) => {
    try {
      const pending = await db.select({
        id: users.id,
        username: users.username,
        legalName: users.legalName,
        idPhoto: users.idPhoto,
        idSelfie: users.idSelfie,
        idVerificationStatus: users.idVerificationStatus,
        idSubmittedAt: users.idSubmittedAt,
        isDriver: users.isDriver,
        profilePhoto: users.profilePhoto,
      }).from(users).where(eq(users.idVerificationStatus, "pending")).orderBy(users.idSubmittedAt);
      res.json(pending);
    } catch {
      res.status(500).json({ message: "Failed to load verifications" });
    }
  });

  app.post('/api/admin/id-verifications/:id/approve', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      await db.update(users).set({
        idVerified: true,
        idVerificationStatus: "approved",
      }).where(eq(users.id, userId));
      const todayCount = await storage.getNotificationCountToday(userId);
      if (todayCount < 5) {
        await storage.createNotification({
          userId,
          type: "system",
          title: "ID Verified! 🛡️",
          message: "Your identity has been verified. You now have a trust badge on your profile!",
          isRead: false,
        });
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to approve verification" });
    }
  });

  app.post('/api/admin/id-verifications/:id/reject', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const reason = req.body.reason || "Photo did not meet verification requirements";
      await db.update(users).set({
        idVerified: false,
        idVerificationStatus: "rejected",
        idPhoto: null,
        idSelfie: null,
      }).where(eq(users.id, userId));
      const todayCount = await storage.getNotificationCountToday(userId);
      if (todayCount < 5) {
        await storage.createNotification({
          userId,
          type: "system",
          title: "ID Verification Update",
          message: `Your verification was not approved: ${reason}. Please try again with a clearer photo.`,
          isRead: false,
        });
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to reject verification" });
    }
  });

  app.get('/api/on-the-way', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hopperLoc = liveLocations.get(req.user!.id);
      if (!hopperLoc || Date.now() - hopperLoc.updatedAt > 120000) {
        return res.json({ driversNearby: false });
      }

      let nearbyCount = 0;
      for (const [driverId, loc] of liveLocations.entries()) {
        if (driverId === req.user!.id) continue;
        if (Date.now() - loc.updatedAt > 120000) continue;
        const dist = getDistance(hopperLoc.latitude, hopperLoc.longitude, loc.latitude, loc.longitude);
        if (dist < 1.5) {
          nearbyCount++;
        }
      }

      res.json({ driversNearby: nearbyCount > 0, count: nearbyCount });
    } catch (err) {
      res.status(500).json({ message: "Failed to check nearby drivers" });
    }
  });

  app.get('/api/admin/transactions', requireAdmin, async (_req, res) => {
    try {
      const completedHops = await db.select().from(shortHops)
        .where(eq(shortHops.status, "completed"))
        .orderBy(desc(shortHops.createdAt))
        .limit(100);

      const allCashouts = await storage.getAllCashouts();
      const allDonations = await db.select().from(donations).orderBy(desc(donations.createdAt)).limit(50);

      const PLATFORM_RATE_PER_MILE = 150;
      const DRIVER_RATE_PER_MILE = 100;

      const hopTransactions = completedHops.map(hop => {
        const miles = parseFloat(hop.distanceMiles?.toString() || "1");
        const grossCents = hop.paymentAmountCents || Math.round(miles * (PLATFORM_RATE_PER_MILE + DRIVER_RATE_PER_MILE));
        const driverPayoutCents = Math.round(miles * DRIVER_RATE_PER_MILE);
        const platformCutCents = grossCents - driverPayoutCents;
        return {
          id: hop.id,
          type: "hop" as const,
          date: hop.createdAt,
          grossCents,
          driverPayoutCents,
          platformCutCents,
          tipCents: hop.tipCents || 0,
          paymentStatus: hop.paymentStatus || "none",
          distance: miles,
          from: hop.startLocation,
          to: hop.endLocation,
        };
      });

      const donationTransactions = allDonations.map((d: any) => ({
        id: d.id,
        type: "donation" as const,
        date: d.createdAt,
        grossCents: d.amountCents,
        driverPayoutCents: 0,
        platformCutCents: d.amountCents,
        tipCents: 0,
        paymentStatus: "captured",
        distance: 0,
        from: d.message || "Community donation",
        to: "ShortHop",
      }));

      const totalGross = hopTransactions.reduce((s, t) => s + t.grossCents, 0);
      const totalDriverPayout = hopTransactions.reduce((s, t) => s + t.driverPayoutCents, 0);
      const totalPlatform = hopTransactions.reduce((s, t) => s + t.platformCutCents, 0);
      const totalTips = hopTransactions.reduce((s, t) => s + t.tipCents, 0);
      const totalDonations = donationTransactions.reduce((s, t) => s + t.grossCents, 0);
      const totalCashoutsAmount = allCashouts.reduce((s, c) => s + (c.amount || 0), 0);

      res.json({
        transactions: [...hopTransactions, ...donationTransactions].sort((a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        ),
        summary: {
          totalGross,
          totalDriverPayout,
          totalPlatform,
          totalTips,
          totalDonations,
          totalCashouts: totalCashoutsAmount,
          hopCount: hopTransactions.length,
        },
      });
    } catch (e: any) {
      console.error('Admin transactions error:', e.message);
      res.status(500).json({ message: "Failed to get transactions" });
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
          type: "admin_broadcast",
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
          type: "admin_broadcast",
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
      const targetSystem = req.body.targetSystem || "rider";
      if (!amount || amount < 1 || amount > 1000) {
        return res.status(400).json({ message: "Amount must be between 1 and 1000" });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      if (targetSystem === "driver") {
        await storage.addDriverEarnings(userId, amount, "admin_grant", `Admin granted ${amount} driver earnings`);
        await storage.createNotification({
          userId,
          type: "reward",
          title: "Driver Earnings Added! 🛞",
          message: `The ShortHop team added $${amount} to your driver earnings.`,
        });
        res.json({ message: `Granted $${amount} driver earnings to ${targetUser.username}`, newBalance: (targetUser.driverEarnings || 0) + amount });
      } else {
        await storage.addRiderCredits(userId, amount, "admin_grant", `Admin granted ${amount} ride credits`);
        await storage.createNotification({
          userId,
          type: "reward",
          title: "You received ride credits! 🛞",
          message: `The ShortHop team gifted you ${amount} ride credit${amount !== 1 ? 's' : ''}. Use them for your next hop!`,
        });
        res.json({ message: `Granted ${amount} ride credits to ${targetUser.username}`, newBalance: (targetUser.riderCredits || 0) + amount });
      }
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

  const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;
  async function purgeOldInboxMessages() {
    try {
      const cutoff = new Date(Date.now() - SIX_MONTHS_MS);
      await db.delete(contactMessages).where(lt(contactMessages.createdAt, cutoff));
    } catch (e) {
      console.error("[inbox-cleanup] Failed:", e);
    }
  }
  setTimeout(() => {
    purgeOldInboxMessages();
    setInterval(purgeOldInboxMessages, ONE_DAY_MS);
  }, 5000);

  app.delete('/api/admin/inbox/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(contactMessages).where(eq(contactMessages.id, Number(req.params.id)));
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete message" });
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
      const filterResult = filterMessage(message);
      if (filterResult.blocked) return res.status(422).json({ message: filterResult.reason, blocked: true });
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

  app.post('/api/founder-chat/:id/react', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const reaction = req.body.reaction || req.body.emoji;
      if (!["👍", "❤️", "😢", "😮", "😡"].includes(reaction)) return res.status(400).json({ message: "Invalid reaction" });
      const id = Number(req.params.id);
      const [msg] = await db.select().from(founderMessages).where(eq(founderMessages.id, id));
      if (!msg) return res.status(404).json({ message: "Not found" });
      const currentReactions = (msg.reactions as Record<string, number>) || {};
      currentReactions[reaction] = (currentReactions[reaction] || 0) + 1;
      const [updated] = await db.update(founderMessages).set({ reactions: currentReactions }).where(eq(founderMessages.id, id)).returning();
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to react" }); }
  });

  app.patch('/api/founder-chat/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = Number(req.params.id);
      const { message } = req.body;
      if (!message || typeof message !== "string") return res.status(400).json({ message: "Message required" });
      const [msg] = await db.select().from(founderMessages).where(eq(founderMessages.id, id));
      if (!msg || msg.userId !== req.user.id) return res.status(403).json({ message: "Cannot edit" });
      const [updated] = await db.update(founderMessages).set({ message: message.slice(0, 1000), editedAt: new Date() }).where(eq(founderMessages.id, id)).returning();
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to edit" }); }
  });

  app.get('/api/city-chat/:city', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    const isFlexPlus = user?.subscription === "flex_hop" || user?.subscription === "power_hop" || user?.isFounder || user?.isAdmin;
    if (!isFlexPlus) return res.status(403).json({ message: "FlexHop+ required" });
    try {
      const city = decodeURIComponent(req.params.city).trim();
      if (!city) return res.status(400).json({ message: "City required" });
      const messages = await db
        .select({
          id: cityMessages.id,
          userId: cityMessages.userId,
          username: users.username,
          message: cityMessages.message,
          isAdminReply: cityMessages.isAdminReply,
          reactions: cityMessages.reactions,
          editedAt: cityMessages.editedAt,
          createdAt: cityMessages.createdAt,
        })
        .from(cityMessages)
        .innerJoin(users, eq(cityMessages.userId, users.id))
        .where(eq(cityMessages.city, city))
        .orderBy(desc(cityMessages.createdAt))
        .limit(100);
      res.json(messages);
    } catch (err) {
      console.error("City chat GET error:", err);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post('/api/city-chat/:city', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    const isFlexPlus = user?.subscription === "flex_hop" || user?.subscription === "power_hop" || user?.isFounder || user?.isAdmin;
    if (!isFlexPlus) return res.status(403).json({ message: "FlexHop+ required" });
    try {
      const city = decodeURIComponent(req.params.city).trim();
      if (!city) return res.status(400).json({ message: "City required" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const filterResult = filterMessage(message);
      if (filterResult.blocked) return res.status(422).json({ message: filterResult.reason, blocked: true });
      const userLang = user!.language || "en";
      let storedMessage = message;
      if (userLang !== "en") {
        const translated = await translateText(message, userLang, "en");
        storedMessage = `${message}\n\n🌐 [EN]: ${translated}`;
      }
      const [msg] = await db.insert(cityMessages).values({
        userId: req.user.id,
        city,
        message: storedMessage,
        isAdminReply: req.user.isAdmin || false,
      }).returning();
      res.json(msg);
    } catch (err) {
      console.error("City chat POST error:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post('/api/city-chat/:city/:id/react', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    const isFlexPlus = user?.subscription === "flex_hop" || user?.subscription === "power_hop" || user?.isFounder || user?.isAdmin;
    if (!isFlexPlus) return res.status(403).json({ message: "FlexHop+ required" });
    try {
      const city = decodeURIComponent(req.params.city).trim();
      const reaction = req.body.reaction || req.body.emoji;
      if (!["👍", "❤️", "😢", "😮", "😡"].includes(reaction)) return res.status(400).json({ message: "Invalid reaction" });
      const id = Number(req.params.id);
      const [msg] = await db.select().from(cityMessages).where(eq(cityMessages.id, id));
      if (!msg) return res.status(404).json({ message: "Not found" });
      if (msg.city !== city) return res.status(403).json({ message: "City mismatch" });
      const currentReactions = (msg.reactions as Record<string, number>) || {};
      currentReactions[reaction] = (currentReactions[reaction] || 0) + 1;
      const [updated] = await db.update(cityMessages).set({ reactions: currentReactions }).where(eq(cityMessages.id, id)).returning();
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to react" }); }
  });

  app.patch('/api/city-chat/:city/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.user.id);
    const isFlexPlus = user?.subscription === "flex_hop" || user?.subscription === "power_hop" || user?.isFounder || user?.isAdmin;
    if (!isFlexPlus) return res.status(403).json({ message: "FlexHop+ required" });
    try {
      const city = decodeURIComponent(req.params.city).trim();
      const id = Number(req.params.id);
      const { message } = req.body;
      if (!message || typeof message !== "string") return res.status(400).json({ message: "Message required" });
      const [msg] = await db.select().from(cityMessages).where(eq(cityMessages.id, id));
      if (!msg || msg.userId !== req.user.id) return res.status(403).json({ message: "Cannot edit" });
      if (msg.city !== city) return res.status(403).json({ message: "City mismatch" });
      const [updated] = await db.update(cityMessages).set({ message: message.slice(0, 1000), editedAt: new Date() }).where(eq(cityMessages.id, id)).returning();
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to edit" }); }
  });

  app.post('/api/vip-chat/:id/react', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const reaction = req.body.reaction || req.body.emoji;
      if (!["👍", "❤️", "😢", "😮", "😡"].includes(reaction)) return res.status(400).json({ message: "Invalid reaction" });
      const id = Number(req.params.id);
      const [msg] = await db.select().from(vipMessages).where(eq(vipMessages.id, id));
      if (!msg) return res.status(404).json({ message: "Not found" });
      const currentReactions = (msg.reactions as Record<string, number>) || {};
      currentReactions[reaction] = (currentReactions[reaction] || 0) + 1;
      const [updated] = await db.update(vipMessages).set({ reactions: currentReactions }).where(eq(vipMessages.id, id)).returning();
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to react" }); }
  });

  app.patch('/api/vip-chat/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = Number(req.params.id);
      const { message } = req.body;
      if (!message || typeof message !== "string") return res.status(400).json({ message: "Message required" });
      const [msg] = await db.select().from(vipMessages).where(eq(vipMessages.id, id));
      if (!msg || msg.userId !== req.user.id) return res.status(403).json({ message: "Cannot edit" });
      const [updated] = await db.update(vipMessages).set({ message: message.slice(0, 1000), editedAt: new Date() }).where(eq(vipMessages.id, id)).returning();
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to edit" }); }
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

      if (accountId) {
        try {
          await stripe.accounts.retrieve(accountId);
        } catch (retrieveErr: any) {
          console.error('Stripe account invalid, creating new one:', retrieveErr.message);
          accountId = null;
          await storage.updateUser(user.id, { stripeAccountId: null } as any);
        }
      }

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
      console.error('Stripe Connect onboard error:', e.message, e.type, e.code);
      res.status(500).json({ message: e.message || "Failed to start Stripe setup" });
    }
  });

  app.get('/api/driver/ride-history', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const driverHops = await db.select().from(shortHops)
        .where(and(
          eq(shortHops.driverId, req.user.id),
          eq(shortHops.status, "completed")
        ))
        .orderBy(desc(shortHops.createdAt))
        .limit(50);

      const enriched = await Promise.all(driverHops.map(async (hop) => {
        const walker = await storage.getUser(hop.walkerId);
        const stops = await db.select().from(spontaneousStops)
          .where(and(
            eq(spontaneousStops.hopId, hop.id),
            eq(spontaneousStops.status, "completed")
          ));

        const ssStop = stops.length > 0 ? stops[0] : null;
        let ssDurationMin = 0;
        if (ssStop?.driverArrivedAt && ssStop?.completedAt) {
          ssDurationMin = Math.round((new Date(ssStop.completedAt).getTime() - new Date(ssStop.driverArrivedAt).getTime()) / 60000);
        }

        const miles = parseFloat(hop.distanceMiles?.toString() || "0");
        const driverEarnedCents = Math.max(Math.round(miles * 100), 150);
        const ssTotalCents = ssStop ? ((ssStop.baseFee || 0) + (ssStop.extraMinutesFee || 0)) : 0;

        return {
          id: hop.id,
          hopperName: walker?.username || "Unknown",
          hopperPhoto: walker?.profilePhoto || null,
          from: hop.startLocation,
          to: hop.endLocation,
          distanceMiles: miles,
          driverEarnedCents,
          tipCents: hop.tipCents || 0,
          completedAt: hop.createdAt,
          seatsNeeded: hop.seatsNeeded || 1,
          hasSpontaneousStop: !!ssStop,
          ssDurationMin,
          ssTotalCents,
        };
      }));

      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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
      if (!user.driverVerified || !user.idVerified) {
        return res.status(400).json({ message: "Driver verification required before cashout. Complete ID and vehicle verification first." });
      }

      const completedHopCount = await storage.getUserCompletedHopCount(user.id);
      if (completedHopCount < 3) {
        return res.status(400).json({ message: `Complete at least 3 rides before your first cashout. You have ${completedHopCount} so far.` });
      }

      if ((user.driverEarnings || 0) < amount) {
        return res.status(400).json({ message: `Not enough earnings. You have $${(user.driverEarnings || 0).toFixed(2)}.` });
      }

      const existingPending = await db.select().from(cashoutRequests)
        .where(and(
          eq(cashoutRequests.userId, user.id),
          eq(cashoutRequests.status, "pending")
        )).limit(1);
      if (existingPending.length > 0) {
        return res.status(400).json({ message: "One payout at a time. Wait for your current one to finish." });
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

  app.get('/api/driver-availability', async (_req, res) => {
    res.json({ count: 0, status: "waiting", message: "Submit your request — we'll match you when a driver is available" });
  });

  app.post('/api/stripe/authorize-hop', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { distanceMiles, departureTime, arrivalDeadline } = req.body;
      const distance = Number(distanceMiles);
      if (!distance || distance <= 0 || distance > 100) {
        return res.status(400).json({ message: "Invalid distance" });
      }

      const RIDER_RATE_PER_MILE_CENTS = 150;
      const amountCents = Math.round(distance * RIDER_RATE_PER_MILE_CENTS);
      const minChargeCents = 150;
      const finalAmount = Math.max(amountCents, minChargeCents);

      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId: String(user.id), username: user.username },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        await storage.updateUser(req.user.id, { stripeSetupCompleted: false });
        return res.status(400).json({ message: "No payment method on file. Please add a card first.", needsSetup: true });
      }

      const depTime = departureTime ? new Date(departureTime) : new Date(Date.now() + 5 * 60000);
      const arrTime = arrivalDeadline ? new Date(arrivalDeadline) : new Date(depTime.getTime() + 45 * 60000);
      const windowExpiry = new Date(depTime.getTime() + 30 * 60000);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalAmount,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethods.data[0].id,
        confirm: true,
        off_session: true,
        capture_method: 'manual',
        metadata: {
          userId: String(req.user.id),
          distanceMiles: String(distance),
          type: 'hop_payment',
        },
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });

      console.log(`[PAYMENT] AUTHORIZED: PI ${paymentIntent.id} for $${(finalAmount / 100).toFixed(2)} | user=${req.user.id} (${user.username}) | ${distance}mi | status=${paymentIntent.status}`);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: finalAmount,
        departureTime: depTime.toISOString(),
        arrivalDeadline: arrTime.toISOString(),
        timeWindowExpiry: windowExpiry.toISOString(),
      });
    } catch (e: any) {
      console.error('[PAYMENT] AUTHORIZATION FAILED:', e.message, `| user=${req.user.id}`);
      res.status(500).json({ message: "Failed to authorize payment" });
    }
  });

  app.post('/api/stripe/refund-failed-hop', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        return res.status(400).json({ message: "Missing paymentIntentId" });
      }
      const stripe = await getUncachableStripeClient();
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (pi.metadata?.userId !== String(req.user.id)) {
        return res.status(403).json({ message: "Not your payment" });
      }

      if (pi.status === "requires_capture") {
        await stripe.paymentIntents.cancel(paymentIntentId);
        console.log(`[PAYMENT] REFUND-FAILED-HOP: cancelled uncaptured PI ${paymentIntentId} for user${req.user.id} | $${(pi.amount / 100).toFixed(2)} released`);
      } else if (pi.status === "succeeded") {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        console.log(`[PAYMENT] REFUND-FAILED-HOP: refunded captured PI ${paymentIntentId} for user${req.user.id} | $${(pi.amount / 100).toFixed(2)} refunded`);
      } else {
        console.log(`[PAYMENT] REFUND-FAILED-HOP: PI ${paymentIntentId} status=${pi.status} — no action needed`);
      }

      res.json({ refunded: true });
    } catch (e: any) {
      console.error(`[PAYMENT] REFUND-FAILED-HOP ERROR: PI ${req.body?.paymentIntentId}:`, e.message);
      res.status(500).json({ message: "Failed to process refund" });
    }
  });

  app.post('/api/stripe/pay-with-wheels', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { distanceMiles, departureTime, arrivalDeadline, startLocation, endLocation, startLat, startLng, endLat, endLng } = req.body;
      const distance = Number(distanceMiles);
      if (!distance || distance <= 0 || distance > 100) {
        return res.status(400).json({ message: "Invalid distance" });
      }

      const RIDER_RATE_PER_MILE_CENTS = 150;
      const amountCents = Math.round(distance * RIDER_RATE_PER_MILE_CENTS);
      const minChargeCents = 150;
      const finalAmount = Math.max(amountCents, minChargeCents);
      const wheelsCost = finalAmount / 100;

      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const userRiderCredits = user.riderCredits || 0;
      if (userRiderCredits < wheelsCost) {
        return res.status(400).json({ message: `Not enough ride credits. You have ${userRiderCredits.toFixed(2)} but need ${wheelsCost.toFixed(2)}.` });
      }

      const deductResult = await db.execute(sql`
        UPDATE users SET rider_credits = rider_credits - ${wheelsCost}
        WHERE id = ${user.id} AND rider_credits >= ${wheelsCost}
        RETURNING rider_credits
      `);
      if (!deductResult.rows || deductResult.rows.length === 0) {
        return res.status(400).json({ message: "Not enough ride credits (balance changed)" });
      }

      const depTime = departureTime ? new Date(departureTime) : new Date(Date.now() + 5 * 60000);
      const arrTime = arrivalDeadline ? new Date(arrivalDeadline) : new Date(depTime.getTime() + 45 * 60000);
      const windowExpiry = new Date(depTime.getTime() + 30 * 60000);

      const wheelPaymentId = `wheels_${Date.now()}_${user.id}`;
      console.log(`[PAYMENT] WHEELS DEDUCTED: ${wheelsCost.toFixed(2)} wheels from user${user.id} (${user.username}) | ${distance}mi | balance: ${userWheels.toFixed(2)} → ${(userWheels - wheelsCost).toFixed(2)} | id=${wheelPaymentId}`);

      res.json({
        paymentIntentId: wheelPaymentId,
        amount: finalAmount,
        wheelsCost,
        newBalance: userWheels - wheelsCost,
        departureTime: depTime.toISOString(),
        arrivalDeadline: arrTime.toISOString(),
        timeWindowExpiry: windowExpiry.toISOString(),
        paidWithWheels: true,
      });
    } catch (e: any) {
      console.error('[PAYMENT] WHEELS DEDUCTION FAILED:', e.message);
      res.status(500).json({ message: "Failed to process wheel payment" });
    }
  });

  app.post('/api/stripe/create-hop-payment', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { hopId, distanceMiles } = req.body;
      if (!hopId) return res.status(400).json({ message: "Missing hop ID" });
      const distance = Number(distanceMiles);
      if (!distance || distance <= 0 || distance > 100) {
        return res.status(400).json({ message: "Invalid distance" });
      }

      const RIDER_RATE_PER_MILE_CENTS = 150;
      const amountCents = Math.round(distance * RIDER_RATE_PER_MILE_CENTS);
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
              description: `ShortHop ride - ${distance.toFixed(1)} miles`,
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

  app.post('/api/stripe/setup-fee', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.stripeSetupCompleted) {
        return res.json({ alreadyCompleted: true, message: "Card already on file" });
      }
      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId: String(user.id), username: user.username },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
      }

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'setup',
        metadata: {
          userId: String(req.user.id),
          type: 'card_setup',
        },
        success_url: `https://${domain}/instahop?setup=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${domain}/instahop?setup=cancelled`,
      });
      res.json({ url: checkoutSession.url, checkoutRequired: true });
    } catch (e: any) {
      console.error('Stripe card setup error:', e.message);
      res.status(500).json({ message: "Failed to create card setup" });
    }
  });

  app.post('/api/stripe/confirm-setup', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Missing session ID" });
      }
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status !== 'complete' || session.metadata?.type !== 'card_setup' || session.metadata?.userId !== String(req.user.id)) {
        return res.status(400).json({ message: "Invalid or incomplete session" });
      }
      await storage.updateUser(req.user.id, { stripeSetupCompleted: true });
      res.json({ success: true });
    } catch (e: any) {
      console.error('Confirm setup error:', e.message);
      res.status(500).json({ message: "Failed to confirm setup" });
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

  app.get('/api/admin/ambassadors', requireAdmin, async (_req, res) => {
    try {
      const ambassadors = await storage.getAmbassadors();
      res.json(ambassadors.map(a => ({ id: a.id, username: a.username, isAmbassador: a.isAmbassador, isDriver: a.isDriver, totalHops: a.totalHops, createdAt: a.createdAt })));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/ambassadors/:id/set', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (!Number.isFinite(userId)) return res.status(400).json({ message: "Invalid user ID" });
      const { isAmbassador } = req.body;
      if (typeof isAmbassador !== "boolean") return res.status(400).json({ message: "isAmbassador must be boolean" });
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ message: "User not found" });
      const updated = await storage.setAmbassador(userId, isAmbassador);
      if (isAmbassador) {
        await storage.createNotification({
          userId,
          title: "🎖️ Ambassador Status Granted",
          message: "You've been appointed as a ShortHop Ambassador! You can now submit moderation requests.",
          type: "system",
        });
      }
      res.json({ id: updated.id, username: updated.username, isAmbassador: updated.isAmbassador });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/admin/ambassador-requests', requireAdmin, async (_req, res) => {
    try {
      const requests = await storage.getAmbassadorRequests();
      res.json(requests);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/ambassador-requests/:id/review', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid request ID" });

      const existing = await storage.getAmbassadorRequests();
      const thisReq = existing.find(r => r.id === id);
      if (!thisReq) return res.status(404).json({ message: "Request not found" });
      if (thisReq.status !== "pending") return res.status(400).json({ message: "Request already reviewed" });

      const target = await storage.getUser(thisReq.targetUserId);
      if (target?.isAdmin) return res.status(403).json({ message: "Cannot take action against admin users" });

      const reviewed = await storage.reviewAmbassadorRequest(id, status, adminNotes);

      if (status === "approved" && target) {
        if (reviewed.actionType === "suspend_hopper" || reviewed.actionType === "suspend_driver") {
          await storage.disableUser(reviewed.targetUserId, true);
          await storage.createNotification({
            userId: reviewed.targetUserId,
            title: "⚠️ Account Suspended",
            message: "Your account has been suspended following a moderation review.",
            type: "system",
          });
        } else if (reviewed.actionType === "delete_hopper" || reviewed.actionType === "delete_driver") {
          await storage.disableUser(reviewed.targetUserId, true);
          await storage.createNotification({
            userId: reviewed.targetUserId,
            title: "🚫 Account Removed",
            message: "Your account has been removed following a moderation review.",
            type: "system",
          });
        }
      }

      await storage.createNotification({
        userId: reviewed.ambassadorId,
        title: status === "approved" ? "✅ Request Approved" : "❌ Request Denied",
        message: `Your moderation request was ${status}. ${adminNotes || ""}`.trim(),
        type: "system",
      });

      res.json(reviewed);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/ambassador/request', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.user as User;
    if (!currentUser.isAmbassador) return res.status(403).json({ message: "Ambassador access required" });

    try {
      const { targetUserId, actionType, evidence } = req.body;
      if (!targetUserId || !actionType || !evidence) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!["suspend_hopper", "suspend_driver", "delete_hopper", "delete_driver"].includes(actionType)) {
        return res.status(400).json({ message: "Invalid action type" });
      }
      const parsedTargetId = parseInt(targetUserId);
      if (!Number.isFinite(parsedTargetId)) return res.status(400).json({ message: "Invalid target user ID" });
      if (parsedTargetId === currentUser.id) return res.status(400).json({ message: "Cannot target yourself" });
      const target = await storage.getUser(parsedTargetId);
      if (!target) return res.status(404).json({ message: "Target user not found" });
      if (target.isAdmin) return res.status(403).json({ message: "Cannot target admin users" });
      if (typeof evidence !== "string" || evidence.trim().length < 10) {
        return res.status(400).json({ message: "Evidence must be at least 10 characters" });
      }
      const request = await storage.createAmbassadorRequest({
        ambassadorId: currentUser.id,
        targetUserId: parsedTargetId,
        actionType,
        evidence: evidence.trim(),
      });
      res.json(request);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/policy', async (_req, res) => {
    try {
      const policy = await storage.getPolicy("unified");
      if (policy) {
        res.json({ content: policy.content, updatedAt: policy.updatedAt });
      } else {
        const legacyPrivacy = await storage.getPolicy("privacy");
        const legacyTerms = await storage.getPolicy("terms");
        const legacySafety = await storage.getPolicy("safety");
        const parts = [legacyPrivacy?.content, legacyTerms?.content, legacySafety?.content].filter(Boolean);
        if (parts.length > 0) {
          const combined = parts.join("\n\n⸻\n\n");
          const latest = [legacyPrivacy?.updatedAt, legacyTerms?.updatedAt, legacySafety?.updatedAt]
            .filter(Boolean)
            .sort()
            .pop() || null;
          res.json({ content: combined, updatedAt: latest });
        } else {
          res.json({ content: null, updatedAt: null });
        }
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/admin/policies', requireAdmin, async (_req, res) => {
    try {
      const allPolicies = await storage.getAllPolicies();
      res.json(allPolicies);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/policies/:type', requireAdmin, async (req, res) => {
    try {
      const type = req.params.type;
      if (!["privacy", "safety", "terms", "unified"].includes(type)) {
        return res.status(400).json({ message: "Invalid policy type" });
      }
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }
      const policy = await storage.updatePolicy(type, content.trim());
      res.json(policy);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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

  setInterval(async () => {
    try {
      const expiredHops = await db.select().from(shortHops)
        .where(and(
          eq(shortHops.status, "requested"),
          isNotNull(shortHops.timeWindowExpiry),
          lt(shortHops.timeWindowExpiry, new Date())
        ));

      for (const hop of expiredHops) {
        await db.update(shortHops)
          .set({ status: "cancelled", paymentStatus: hop.paymentIntentId ? "refunded" : "none" })
          .where(eq(shortHops.id, hop.id));

        if (hop.paymentIntentId && hop.paymentStatus === "authorized") {
          try {
            const stripe = await getUncachableStripeClient();
            await stripe.paymentIntents.cancel(hop.paymentIntentId);
          } catch (e: any) {
            console.error(`Auto-cancel PaymentIntent ${hop.paymentIntentId} failed:`, e.message);
          }
        }

        if (hop.walkerId) {
          await storage.createNotification({
            userId: hop.walkerId,
            type: "system",
            title: "Hop Expired ⏰",
            message: hop.paymentIntentId
              ? "Your hop request expired without a match. Your payment authorization has been released — no charge."
              : "Your hop request expired without a match. Try again when more drivers are available.",
            isRead: false,
          });
        }
      }
    } catch (e: any) {
      console.error('Auto-cancel interval error:', e.message);
    }
  }, 60000);

  setInterval(async () => {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const pendingVerifications = await db.select().from(users)
        .where(and(
          eq(users.idVerificationStatus, "pending"),
          lt(users.idSubmittedAt as any, threeDaysAgo)
        ));

      for (const user of pendingVerifications) {
        await db.update(users).set({
          idVerified: true,
          idVerificationStatus: "approved",
        }).where(eq(users.id, user.id));
        
        const todayCount = await storage.getNotificationCountToday(user.id);
        if (todayCount < 5) {
          await storage.createNotification({
            userId: user.id,
            type: "system",
            title: "ID Verified! 🛡️",
            message: "Your identity has been verified. You now have a trust badge on your profile!",
            isRead: false,
          });
        }
      }

      if (pendingVerifications.length > 0) {
        console.log(`Auto-approved ${pendingVerifications.length} ID verification(s) after 3 days of inactivity`);
      }
    } catch (e: any) {
      console.error('Auto-approve ID verification error:', e.message);
    }
  }, 3600000);

  startMatchingCycle();

  return httpServer;
}
