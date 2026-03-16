import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Navigation, Bookmark, MapPin, Mail, Car, X, Shield, Clock, AlertTriangle, Power, Bell, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHops, useRequestHop, useCancelHop } from "@/hooks/use-hops";
import { useGeolocation } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { WelcomeGlobe, hasSeenWelcomeGlobe } from "@/components/WelcomeGlobe";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { User } from "@shared/routes";
import hopperAloneUrl from "@assets/Untitled_design_1773399128365.png";
import driverAloneUrl from "@assets/Untitled_design_1773399149078.png";
import driverWithHopperUrl from "@assets/Untitled_design_1773399128366.png";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

type DriverStatus = {
  isDriver: boolean;
  isActive: boolean;
  driverVerified: boolean;
  vehicleMake: string | null;
  applicationStatus: string | null;
};

const searchSchema = z.object({
  startLocation: z.string().min(2, "Required"),
  endLocation: z.string().min(2, "Required"),
});

type WalkerRouteData = { id: number; name: string; startLocation: string; endLocation: string };
type Corridor = { id: number; name: string; description?: string; lat: number; lng: number; widthRank: number };

const CORRIDORS: Corridor[] = [
  { id: 1, name: "New Circle Rd NW", lat: 38.0680, lng: -84.5350, widthRank: 1 },
  { id: 2, name: "New Circle Rd N", lat: 38.0720, lng: -84.5100, widthRank: 1 },
  { id: 3, name: "New Circle Rd NE", lat: 38.0650, lng: -84.4750, widthRank: 1 },
  { id: 4, name: "New Circle Rd E", lat: 38.0420, lng: -84.4550, widthRank: 1 },
  { id: 5, name: "New Circle Rd SE", lat: 38.0200, lng: -84.4700, widthRank: 1 },
  { id: 6, name: "New Circle Rd S", lat: 38.0100, lng: -84.5100, widthRank: 1 },
  { id: 7, name: "New Circle Rd SW", lat: 38.0200, lng: -84.5400, widthRank: 1 },
  { id: 8, name: "New Circle Rd W", lat: 38.0450, lng: -84.5550, widthRank: 1 },
  { id: 9, name: "Man o' War Blvd E", lat: 37.9980, lng: -84.4600, widthRank: 1 },
  { id: 10, name: "Man o' War Blvd S", lat: 37.9900, lng: -84.5050, widthRank: 1 },
  { id: 11, name: "Man o' War Blvd W", lat: 37.9950, lng: -84.5400, widthRank: 1 },
  { id: 12, name: "Nicholasville Rd N", lat: 38.0400, lng: -84.5040, widthRank: 2 },
  { id: 13, name: "Nicholasville Rd", lat: 38.0280, lng: -84.5050, widthRank: 2 },
  { id: 14, name: "Nicholasville Rd S", lat: 38.0100, lng: -84.5060, widthRank: 2 },
  { id: 15, name: "Richmond Rd", lat: 38.0350, lng: -84.4780, widthRank: 2 },
  { id: 16, name: "Richmond Rd E", lat: 38.0250, lng: -84.4600, widthRank: 2 },
  { id: 17, name: "Harrodsburg Rd N", lat: 38.0350, lng: -84.5200, widthRank: 2 },
  { id: 18, name: "Harrodsburg Rd S", lat: 38.0150, lng: -84.5350, widthRank: 2 },
  { id: 19, name: "Tates Creek Rd N", lat: 38.0300, lng: -84.4930, widthRank: 3 },
  { id: 20, name: "Tates Creek Rd S", lat: 38.0100, lng: -84.4900, widthRank: 3 },
  { id: 21, name: "Georgetown Rd", lat: 38.0620, lng: -84.5140, widthRank: 3 },
  { id: 22, name: "Versailles Rd", lat: 38.0500, lng: -84.5400, widthRank: 3 },
  { id: 23, name: "Leestown Rd", lat: 38.0560, lng: -84.5320, widthRank: 3 },
  { id: 24, name: "Broadway", lat: 38.0470, lng: -84.4990, widthRank: 3 },
  { id: 25, name: "Main St", lat: 38.0490, lng: -84.4960, widthRank: 3 },
  { id: 26, name: "Limestone St", lat: 38.0440, lng: -84.4970, widthRank: 4 },
  { id: 27, name: "S Broadway", lat: 38.0390, lng: -84.5000, widthRank: 3 },
  { id: 28, name: "Winchester Rd", lat: 38.0550, lng: -84.4800, widthRank: 3 },
  { id: 29, name: "Bryan Station Rd", lat: 38.0700, lng: -84.4850, widthRank: 3 },
  { id: 30, name: "Russell Cave Rd", lat: 38.0650, lng: -84.4950, widthRank: 3 },
  { id: 31, name: "Clays Mill Rd", lat: 38.0200, lng: -84.5500, widthRank: 4 },
  { id: 32, name: "Alumni Dr", lat: 38.0300, lng: -84.5100, widthRank: 4 },
  { id: 33, name: "Waller Ave", lat: 38.0380, lng: -84.5080, widthRank: 4 },
  { id: 34, name: "Rose St", lat: 38.0420, lng: -84.5040, widthRank: 4 },
  { id: 35, name: "Euclid Ave", lat: 38.0430, lng: -84.5100, widthRank: 4 },
  { id: 36, name: "High St", lat: 38.0460, lng: -84.4940, widthRank: 4 },
  { id: 37, name: "Southland Dr", lat: 38.0200, lng: -84.5150, widthRank: 4 },
  { id: 38, name: "Lane Allen Rd", lat: 38.0250, lng: -84.5300, widthRank: 4 },
  { id: 39, name: "Liberty Rd", lat: 38.0100, lng: -84.4750, widthRank: 4 },
  { id: 40, name: "Athens-Boonesboro Rd", lat: 38.0300, lng: -84.4500, widthRank: 4 },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SEARCH_BANDS_MILES = [50/5280, 100/5280, 150/5280, 200/5280, 300/5280, 500/5280, 1000/5280];

function getNearestCorridors(userLat: number | null, userLng: number | null): Corridor[] {
  if (!userLat || !userLng) return CORRIDORS.slice(0, 1);
  const withDist = CORRIDORS.map(c => ({
    ...c,
    dist: haversineDistance(userLat, userLng, c.lat, c.lng),
  }));

  for (const band of SEARCH_BANDS_MILES) {
    const inBand = withDist.filter(c => c.dist <= band);
    if (inBand.length > 0) {
      inBand.sort((a, b) => a.widthRank !== b.widthRank ? a.widthRank - b.widthRank : a.dist - b.dist);
      return [inBand[0]];
    }
  }

  withDist.sort((a, b) => a.dist - b.dist);
  return withDist.slice(0, 1);
}

type HopMode = "hop" | "walk" | "drive";

const LEX_CENTER: [number, number] = [-84.5037, 38.0406];

function createMarkerEl(src: string): HTMLElement {
  const el = document.createElement("div");
  el.style.width = "56px";
  el.style.height = "56px";
  el.style.filter = "drop-shadow(0 3px 6px rgba(0,0,0,0.35))";
  const img = document.createElement("img");
  img.src = src;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  el.appendChild(img);
  return el;
}

function getMarkerIcon(mode: HopMode, hasMatchedRide: boolean): string {
  if (hasMatchedRide) return driverWithHopperUrl;
  if (mode === "drive") return driverAloneUrl;
  return hopperAloneUrl;
}

function MapView({ mode, latitude, longitude, hasMatchedRide, walkingRoute }: { mode: HopMode; latitude: number | null; longitude: number | null; hasMatchedRide: boolean; walkingRoute: GeoJSON.LineString | null }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: [number, number] = latitude && longitude ? [longitude, latitude] : LEX_CENTER;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 15,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    mapRef.current = map;

    return () => {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;

    const lngLat: [number, number] = [longitude, latitude];
    const iconSrc = getMarkerIcon(mode, hasMatchedRide);

    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
      const el = markerRef.current.getElement();
      const img = el.querySelector("img");
      if (img) img.src = iconSrc;
    } else {
      const el = createMarkerEl(iconSrc);
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(mapRef.current);
    }

    if (!walkingRoute) {
      mapRef.current.easeTo({ center: lngLat, duration: 800 });
    }
  }, [latitude, longitude, mode, hasMatchedRide]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function addOrUpdateRoute() {
      if (!map!.isStyleLoaded()) return;

      if (map!.getSource("walking-route")) {
        if (walkingRoute) {
          (map!.getSource("walking-route") as mapboxgl.GeoJSONSource).setData(walkingRoute);
        } else {
          (map!.getSource("walking-route") as mapboxgl.GeoJSONSource).setData({ type: "LineString", coordinates: [] });
        }
      } else if (walkingRoute) {
        map!.addSource("walking-route", { type: "geojson", data: walkingRoute });
        map!.addLayer({
          id: "walking-route-line",
          type: "line",
          source: "walking-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#f97316", "line-width": 5, "line-opacity": 0.85, "line-dasharray": [2, 1] },
        });
      }

      if (walkingRoute && walkingRoute.coordinates.length > 1) {
        const coords = walkingRoute.coordinates as [number, number][];
        const destCoord = coords[coords.length - 1];

        if (destMarkerRef.current) {
          destMarkerRef.current.setLngLat(destCoord);
        } else {
          const el = document.createElement("div");
          el.className = "walking-dest-marker";
          el.innerHTML = `<div style="width:24px;height:24px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="color:white;font-size:12px;font-weight:900">📍</span></div>`;
          destMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(destCoord).addTo(map!);
        }

        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach(c => bounds.extend(c));
        map!.fitBounds(bounds, { padding: { top: 80, bottom: 280, left: 50, right: 50 }, duration: 1000 });
      } else {
        if (destMarkerRef.current) {
          destMarkerRef.current.remove();
          destMarkerRef.current = null;
        }
      }
    }

    if (map.isStyleLoaded()) {
      addOrUpdateRoute();
    } else {
      map.once("style.load", addOrUpdateRoute);
    }
  }, [walkingRoute]);

  return (
    <div className="absolute inset-0 z-0" data-testid="map-view">
      <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 0 }} />
    </div>
  );
}

function GlowingCarousel({ user }: { user: User }) {
  const items = [
    { emoji: "🔥", value: user.hopStreak || 0, label: "streak" },
    { emoji: "⭐", value: user.totalHops || 0, label: "hops" },
    { emoji: "🛞", value: user.credits || 0, label: "wheels" },
  ];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % items.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1" data-testid="glowing-carousel">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl blur-md bg-orange-400/25 scale-110" />
        <div className="relative bg-card/95 backdrop-blur-lg border border-orange-400/40 rounded-2xl px-3 py-2 shadow-lg min-w-[70px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center"
            >
              <span className="text-lg leading-none">{items[activeIdx].emoji}</span>
              <span className="text-sm font-black text-foreground leading-none mt-0.5">{items[activeIdx].value}</span>
              <span className="text-[8px] text-muted-foreground font-semibold">{items[activeIdx].label}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="flex gap-1">
        {items.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIdx ? "bg-orange-500" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}

function DriveNowPanel({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: driverStatus } = useQuery<DriverStatus>({
    queryKey: ['/api/driver/status'],
  });

  const { data: hops } = useHops();

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      await apiRequest("POST", "/api/driver/active", { active });
    },
    onSuccess: (_data, active) => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      showFlash(active ? "🟢" : "🔴", active ? "You're active!" : "You're offline", active ? "success" : "info");
    },
    onError: (err: any) => {
      showFlash("⚠️", err?.message || "Can't toggle status", "error");
    },
  });

  const isVerified = driverStatus?.driverVerified ?? false;
  const isActiveNow = driverStatus?.isActive ?? false;
  const appStatus = driverStatus?.applicationStatus;
  const needsOnboarding = !driverStatus?.vehicleMake && !appStatus;

  const availableHops = hops?.filter(h => h.status === 'requested') || [];

  return (
    <div className="space-y-3">
      <p className="text-base font-extrabold text-foreground/70 text-center" data-testid="text-driver-greeting">
        happy driving,{" "}
        <span className="text-foreground font-black">{user.username}</span>
      </p>

      {needsOnboarding && (
        <Card className="border-border/50 shadow-md rounded-2xl" data-testid="card-onboarding-prompt">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-base font-bold text-foreground">Become a Driver</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">1</div>
                <p className="text-sm text-foreground">Verify your license</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">2</div>
                <p className="text-sm text-foreground">Add your vehicle</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">3</div>
                <p className="text-sm text-foreground">Start accepting hops</p>
              </div>
            </div>
            <button
              className="w-full primary-action-btn flex items-center justify-center gap-2"
              onClick={() => setLocation("/driver-onboarding")}
              data-testid="button-start-onboarding"
            >
              <Shield className="w-5 h-5" />
              Start Driver Setup
            </button>
          </CardContent>
        </Card>
      )}

      {appStatus === "pending" && (
        <Card className="border-yellow-200 bg-yellow-50/50 rounded-2xl" data-testid="card-pending-verification">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-700">Verification Pending</p>
              <p className="text-[10px] text-muted-foreground">Your application is under review.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {appStatus === "rejected" && (
        <Card className="border-red-200 bg-red-50/50 rounded-2xl" data-testid="card-rejected">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">Not Approved</p>
              <p className="text-[10px] text-muted-foreground">Update your info and reapply.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => setLocation("/driver-onboarding")} data-testid="button-reapply">
              Reapply
            </Button>
          </CardContent>
        </Card>
      )}

      {isVerified && (
        <Card className={`border-2 transition-colors rounded-2xl ${isActiveNow ? 'border-green-400 bg-green-50/30 dark:bg-green-950/20' : 'border-border/50'}`} data-testid="card-active-toggle">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isActiveNow ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-muted'
                }`}>
                  <Power className={`w-5 h-5 ${isActiveNow ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-bold">{isActiveNow ? "You're Active" : "Go Active"}</p>
                  <p className="text-[10px] text-muted-foreground">{isActiveNow ? "Accepting hop requests" : "Tap to start driving"}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={isActiveNow ? "destructive" : "default"}
                onClick={() => toggleActive.mutate(!isActiveNow)}
                disabled={toggleActive.isPending}
                data-testid="button-toggle-active"
              >
                {isActiveNow ? "Stop" : "Start"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isVerified && availableHops.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {availableHops.length} hop request{availableHops.length !== 1 ? 's' : ''} nearby
        </div>
      )}

      {isVerified && <DriverAutoNotifications hopsCount={availableHops.length} />}
    </div>
  );
}

const AUTO_NOTIF_KEY = "sh-driver-auto-notify";

function DriverAutoNotifications({ hopsCount }: { hopsCount: number }) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(AUTO_NOTIF_KEY) === "true"; } catch { return false; }
  });
  const prevCountRef = useRef(hopsCount);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = useCallback(async () => {
    const next = !enabled;
    if (next) {
      if ("Notification" in window && Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          showFlash("🔕", "Notifications blocked by browser", "error");
          return;
        }
      }
    }
    setEnabled(next);
    try { localStorage.setItem(AUTO_NOTIF_KEY, String(next)); } catch {}
    showFlash(next ? "🔔" : "🔕", next ? "Auto-notifications ON" : "Auto-notifications OFF", next ? "success" : "info");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (hopsCount > prevCountRef.current) {
      if (!audioRef.current) {
        audioRef.current = new Audio("/driver-approaching-alert.m4a");
        audioRef.current.volume = 0.9;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Short Hop — New Pickup!", {
          body: "A hopper needs a ride before your route. Tap to check!",
          icon: "/icon-192.png",
          tag: "sh-pickup-alert",
        });
      }
    }
    prevCountRef.current = hopsCount;
  }, [hopsCount, enabled]);

  return (
    <>
      <Card className={`border transition-colors rounded-2xl ${enabled ? 'border-orange-300 bg-orange-50/30 dark:bg-orange-950/10' : 'border-border/50'}`} data-testid="card-auto-notify">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${enabled ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-muted'}`}>
                {enabled ? <Bell className="w-4 h-4 text-orange-500" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold">{enabled ? "Auto-Alerts ON" : "Auto-Alerts"}</p>
                <p className="text-[10px] text-muted-foreground">Alert when pickup is on your route</p>
              </div>
            </div>
            <Button
              size="sm"
              variant={enabled ? "default" : "outline"}
              className="text-xs h-7 shrink-0"
              onClick={toggle}
              data-testid="button-toggle-auto-notify"
            >
              {enabled ? "ON" : "OFF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-blue-50/30 dark:bg-blue-950/10 rounded-2xl" data-testid="card-detour-notice">
        <CardContent className="p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">💡</div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Detours increase your chances of getting a hopper</span> along your route. You can take small detours and still head in the same direction—more flexibility means more hops!
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function InstaHopView({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const cancelHop = useCancelHop();
  const geo = useGeolocation();
  const [showGlobe, setShowGlobe] = useState(() => !hasSeenWelcomeGlobe());
  const [greetingVisible, setGreetingVisible] = useState(() => hasSeenWelcomeGlobe());
  const [mode, setMode] = useState<HopMode>(() => {
    try {
      return localStorage.getItem("sh-active-tab") === "driver" ? "drive" : "hop";
    } catch { return "hop"; }
  });
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    function onModeChange(e: Event) {
      const tab = (e as CustomEvent).detail;
      if (tab === "driver") setMode("drive");
      else if (mode === "drive") setMode("hop");
    }
    window.addEventListener("sh-mode-change", onModeChange);
    return () => window.removeEventListener("sh-mode-change", onModeChange);
  }, [mode]);

  const activeHop = hops?.find(h => h.status !== "completed" && h.status !== "cancelled");

  useEffect(() => {
    if (activeHop && activeHop.status === "matched") {
      setIsMatching(false);
    }
  }, [activeHop]);

  useEffect(() => {
    if (!activeHop || activeHop.status !== "requested") return;

    const handleBeforeUnload = () => {
      const url = `/api/hops/${activeHop.id}/cancel`;
      const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeHop]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'success') {
      const sessionId = params.get('session_id');
      if (sessionId) {
        apiRequest("POST", "/api/stripe/confirm-setup", { sessionId }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/me'] });
          showFlash("✅", "Account activated!", "success");
        }).catch(() => {
          showFlash("⚠️", "Activation verification failed. Please contact support.", "error");
        });
      }
      window.history.replaceState({}, "", "/instahop");
    }
  }, []);

  const { data: savedRoutes } = useQuery<WalkerRouteData[]>({
    queryKey: ['/api/walker-routes'],
  });

  const { data: networkStats } = useQuery<{ totalUsers: number; totalDrivers: number; totalHoppers: number; activeDrivers: number }>({
    queryKey: ['/api/network-stats'],
  });

  const driversInCity = networkStats?.activeDrivers ?? 0;
  const hoppersNearby = networkStats?.totalHoppers ?? 24;

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { startLocation: "", endLocation: "" }
  });

  const destination = form.watch("endLocation");

  useEffect(() => {
    if (!geo.permitted) geo.requestPermission();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const route = params.get('route');
    if (route) {
      const parts = route.split(' → ');
      if (parts.length === 2) {
        form.setValue("startLocation", parts[0]);
        form.setValue("endLocation", parts[1]);
      }
      window.history.replaceState({}, "", "/instahop");
    }
  }, []);

  const [cardHoldUrl, setCardHoldUrl] = useState<string | null>(null);
  const [tooFarForInstahop, setTooFarForInstahop] = useState(false);

  const onSubmit = async (data: z.infer<typeof searchSchema>) => {
    if (mode === "walk") {
      showFlash("🚶", "GPS navigation starting...", "info");
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !data.startLocation || !data.endLocation) {
      showFlash("⚠️", "Need location data", "error");
      return;
    }

    try {
      const startQuery = encodeURIComponent(data.startLocation + ", Lexington, KY");
      const startRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${startQuery}.json?access_token=${token}&limit=1`);
      const startJson = await startRes.json();
      if (!startJson.features?.length) {
        showFlash("⚠️", "Can't find pickup location", "error");
        return;
      }
      const [startLng, startLat] = startJson.features[0].center;

      const endQuery = encodeURIComponent(data.endLocation + ", Lexington, KY");
      const endRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${endQuery}.json?access_token=${token}&limit=1`);
      const endJson = await endRes.json();
      if (!endJson.features?.length) {
        showFlash("⚠️", "Can't find destination", "error");
        return;
      }
      const [endLng, endLat] = endJson.features[0].center;

      const directionsRes = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${token}`
      );
      const directionsJson = await directionsRes.json();
      if (!directionsJson.routes?.length) {
        showFlash("⚠️", "Can't calculate distance", "error");
        return;
      }

      const distanceMiles = directionsJson.routes[0].distance / 1609.34;

      if (distanceMiles > 10) {
        setTooFarForInstahop(true);
        showFlash("📅", "Use Plan a Ride for trips over 10 miles", "info");
        return;
      }

      if (!user.stripeSetupCompleted) {
        try {
          const setupRes = await apiRequest("POST", "/api/stripe/setup-fee", {});
          const setupJson = await setupRes.json();
          if (setupJson.url) {
            setCardHoldUrl(setupJson.url);
            showFlash("💳", "Verify your card is active before continuing", "info");
            return;
          }
        } catch (e) {
          showFlash("❌", "Card verification failed", "error");
          return;
        }
      }

      setIsMatching(true);
      const hopData: any = { ...data, hopType: 'short_hop', distanceMiles };
      hopData.startLat = String(startLat);
      hopData.startLng = String(startLng);
      hopData.endLat = String(endLat);
      hopData.endLng = String(endLng);

      requestHop.mutate(hopData, {
        onSuccess: () => {
          showFlash("⚡", mode === "drive" ? "Drive started!" : "InstaHop requested!", "success");
        },
        onError: () => {
          setIsMatching(false);
        }
      });
    } catch (e) {
      showFlash("⚠️", "Error processing request", "error");
    }
  };

  const nearestCorridors = getNearestCorridors(geo.latitude, geo.longitude);
  const [walkingRoute, setWalkingRoute] = useState<GeoJSON.LineString | null>(null);
  const [walkingInfo, setWalkingInfo] = useState<{ distance: string; duration: string } | null>(null);
  const fetchWalkingRoute = useCallback(async (corridor: Corridor) => {
    if (!geo.latitude || !geo.longitude) {
      showFlash("📍", "Enable location to get directions", "error");
      return;
    }
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${geo.longitude},${geo.latitude};${corridor.lng},${corridor.lat}?geometries=geojson&overview=full&steps=true&access_token=${token}`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setWalkingRoute(route.geometry as GeoJSON.LineString);
        const mins = Math.round(route.duration / 60);
        const miles = (route.distance / 1609.34).toFixed(1);
        setWalkingInfo({ distance: `${miles} mi`, duration: `${mins} min` });
        form.setValue("startLocation", corridor.name);
        showFlash("🚶", `${mins} min walk to ${corridor.name}`, "info");
      }
    } catch {
      showFlash("⚠️", "Couldn't load directions", "error");
    }
  }, [geo.latitude, geo.longitude]);

  const isDriverMode = mode === "drive";

  function cancelMatching() {
    setIsMatching(false);
    if (activeHop && activeHop.status === "requested") {
      cancelHop.mutate(activeHop.id);
    }
  }

  return (
    <>
      {showGlobe && (
        <WelcomeGlobe
          username={user.username}
          isReturning={true}
          onDismiss={() => {
            setShowGlobe(false);
            setTimeout(() => setGreetingVisible(true), 80);
          }}
        />
      )}

      <div className="fixed inset-0 top-0 bottom-[4rem] flex flex-col">
        <MapView mode={mode} latitude={geo.latitude} longitude={geo.longitude} hasMatchedRide={!!(activeHop && (activeHop.status === "matched" || activeHop.status === "in_ride"))} walkingRoute={walkingRoute} />

        <div
          className="absolute bottom-0 left-0 right-0 bg-background/97 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-border/30 z-20"
          style={{ height: "40%" }}
          data-testid="control-panel"
        >
          <div className="px-4 pt-3 pb-2 h-full overflow-y-auto">
            {isDriverMode ? (
              <DriveNowPanel user={user} />
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-700/30 p-3">
                    <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      🚦 Stay aware and cross safely at marked intersections
                    </p>
                  </div>

                  <div className="flex-1">
                    <AnimatePresence>
                      {greetingVisible && (
                        <motion.p
                          key="greeting"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-base font-extrabold text-foreground/70 text-center mb-1"
                          data-testid="text-instahop-greeting"
                        >
                          happy hopping,{" "}
                          <span className="text-foreground font-black">{user.username}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="shrink-0 scale-75 origin-top-right">
                    <GlowingCarousel user={user} />
                  </div>
                </div>

                {cardHoldUrl && (
                  <Card className="border-orange-500/40 bg-gradient-to-br from-orange-500/10 to-transparent mb-2" data-testid="card-card-hold">
                    <CardContent className="py-3 px-4 space-y-2">
                      <p className="text-sm font-bold text-foreground">Verify Your Card</p>
                      <p className="text-xs text-muted-foreground">$1 temporary hold to confirm your card is active.</p>
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9"
                        onClick={() => window.location.href = cardHoldUrl}
                        data-testid="button-verify-card"
                      >
                        Complete Verification
                      </Button>
                      <button
                        type="button"
                        onClick={() => setCardHoldUrl(null)}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition"
                      >
                        Cancel
                      </button>
                    </CardContent>
                  </Card>
                )}

                {tooFarForInstahop && (
                  <Card className="border-blue-500/40 bg-gradient-to-br from-blue-500/10 to-transparent mb-2" data-testid="card-plan-ride">
                    <CardContent className="py-3 px-4 space-y-2">
                      <p className="text-sm font-bold text-foreground">Too Far for InstaHop</p>
                      <p className="text-xs text-muted-foreground">Trips over 10 miles use Plan a Ride in Tailor for prepayment.</p>
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9"
                        onClick={() => setLocation("/dashboard")}
                        data-testid="button-go-to-plan"
                      >
                        Go to Plan a Ride
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <div
                        className="h-11 text-sm font-bold rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-700/40 pl-9 pr-3 flex items-center justify-between text-green-700 dark:text-green-400"
                        data-testid="display-instahop-start"
                      >
                        <span>{form.watch("startLocation") || "📍 Auto current location"}</span>
                        {walkingInfo && (
                          <span className="text-[10px] font-semibold text-orange-500 shrink-0 ml-2">{walkingInfo.duration} · {walkingInfo.distance}</span>
                        )}
                      </div>
                      <input type="hidden" {...form.register("startLocation")} />
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm bg-orange-500" />
                      <Input
                        placeholder="Where to?"
                        className="h-11 text-sm rounded-xl bg-muted/40 border-border/50 pl-9 focus:bg-background font-semibold"
                        data-testid="input-instahop-destination"
                        {...form.register("endLocation")}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      type="submit"
                      disabled={requestHop.isPending || isMatching}
                      whileTap={{ scale: 0.97 }}
                      className={`flex-1 h-14 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl transition-all disabled:opacity-60 ${
                        isMatching
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/25"
                          : "bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/25"
                      }`}
                      data-testid="button-instahop"
                    >
                      {isMatching ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          matching you...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          {requestHop.isPending ? 'Finding...' : 'InstaHop'}
                        </>
                      )}
                    </motion.button>

                    {isMatching && (
                      <motion.button
                        type="button"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={cancelMatching}
                        className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0"
                        data-testid="button-cancel-matching"
                      >
                        <X className="w-6 h-6" strokeWidth={3} />
                      </motion.button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    {driversInCity > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5" />
                        <span>{driversInCity} driver{driversInCity !== 1 ? 's' : ''} active nearby</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Navigation className="w-3 h-3" />
                      <span>{hoppersNearby} hoppers nearby</span>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function InstaHop() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return <InstaHopView user={user} />;
}
