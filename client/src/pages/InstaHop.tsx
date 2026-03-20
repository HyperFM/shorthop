import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Navigation, Bookmark, MapPin, Mail, Car, X, Shield, Clock, AlertTriangle, Power, Bell, BellOff, Phone, Users, Home, Briefcase, Star, Settings2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHops, useRequestHop, useCancelHop, useAcceptHop } from "@/hooks/use-hops";
import { useGeolocation, useLiveLocationBroadcast, useHopTracking } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { useMagicGps, type SavedRouteMatch } from "@/hooks/use-magic-gps";
import { MagicGpsSuggestion, MagicGpsActivation, MagicGpsStatus, FlowModeNotification, DriftCatchNotification, OnTheWayPing, RepeatRoutePrompt } from "@/components/MagicGpsNotification";
import type { SavedRoute } from "@shared/schema";
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
  const [mapError, setMapError] = useState(false);
  const mapErrorRef = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || mapErrorRef.current) return;

    const center: [number, number] = latitude && longitude ? [longitude, latitude] : LEX_CENTER;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom: 15,
        attributionControl: false,
      });
    } catch (e) {
      console.warn("Map init failed (WebGL not available):", e);
      mapErrorRef.current = true;
      setMapError(true);
      return;
    }

    map.on("error", (e: any) => {
      if (e?.error?.message?.includes("WebGL")) {
        mapErrorRef.current = true;
        setMapError(true);
        map.remove();
      }
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

  if (mapError) {
    return (
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-green-100 to-green-50 dark:from-green-950/20 dark:to-background flex items-center justify-center" data-testid="map-view">
        <div className="text-center opacity-50">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-primary" />
          <p className="text-xs text-muted-foreground">Lexington, KY</p>
        </div>
      </div>
    );
  }

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

function useReverseGeocode(lat: string | null | undefined, lng: string | null | undefined) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return useQuery<string>({
    queryKey: ['/reverse-geocode', lat, lng],
    queryFn: async () => {
      if (!lat || !lng || !token) return "Unknown location";
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&types=address`);
      const json = await res.json();
      if (json.features?.length) {
        const f = json.features[0];
        const short = f.text + (f.address ? " " + f.address : "");
        return short || f.place_name?.split(",")[0] || "Unknown location";
      }
      return "Unknown location";
    },
    enabled: !!lat && !!lng && !!token,
    staleTime: 60000,
  });
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasValidCoords(lat: any, lng: any): boolean {
  if (!lat || !lng) return false;
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return isFinite(la) && isFinite(ln) && la !== 0 && ln !== 0;
}

function HopRequestCard({ hop, driverLat, driverLng, onNavigate }: {
  hop: any;
  driverLat: number | null;
  driverLng: number | null;
  onNavigate: (hop: any) => void;
}) {
  const acceptHop = useAcceptHop();
  const hopHasCoords = hasValidCoords(hop.startLat, hop.startLng);
  const { data: address, isLoading: addrLoading } = useReverseGeocode(
    hopHasCoords ? hop.startLat : null,
    hopHasCoords ? hop.startLng : null
  );

  const distance = (driverLat && driverLng && hopHasCoords)
    ? calcDistance(driverLat, driverLng, parseFloat(hop.startLat), parseFloat(hop.startLng))
    : null;

  const handleAccept = () => {
    acceptHop.mutate(hop.id, {
      onSuccess: () => {
        if (hopHasCoords) {
          onNavigate(hop);
        } else {
          showFlash("✅", "Hop accepted! Hopper location not available for navigation.", "success");
        }
      },
      onError: (err: any) => {
        showFlash("⚠️", err?.message || "Couldn't accept hop", "error");
      },
    });
  };

  const bearing = (driverLat && driverLng && hopHasCoords)
    ? (() => {
        const dLng = (parseFloat(hop.startLng) - driverLng) * Math.PI / 180;
        const lat1 = driverLat * Math.PI / 180;
        const lat2 = parseFloat(hop.startLat) * Math.PI / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        if (deg < 45 || deg >= 315) return "North";
        if (deg < 135) return "East";
        if (deg < 225) return "South";
        return "West";
      })()
    : null;

  const timeRemaining = hop.timeWindowExpiry
    ? Math.max(0, Math.floor((new Date(hop.timeWindowExpiry).getTime() - Date.now()) / 60000))
    : null;

  return (
    <Card className="border-primary/20" data-testid={`hop-request-${hop.id}`}>
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <p className="text-xs font-bold text-foreground truncate" data-testid={`text-hop-address-${hop.id}`}>
                {addrLoading ? "Locating..." : (address || hop.startLocation)}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-muted-foreground truncate">→ {hop.endLocation}</p>
              {distance !== null && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0" data-testid={`text-hop-distance-${hop.id}`}>
                  {distance < 0.1 ? "< 0.1 mi" : distance.toFixed(1) + " mi"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {bearing && (
                <span className="text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full" data-testid={`text-hop-direction-${hop.id}`}>
                  ↑ Ahead of you · {bearing}
                </span>
              )}
              {timeRemaining !== null && timeRemaining > 0 && (
                <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />{timeRemaining}m left
                </span>
              )}
              {(hop.seatsNeeded || 1) > 1 && (
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full" data-testid={`text-hop-seats-${hop.id}`}>
                  {hop.seatsNeeded} seats
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            className="h-7 text-xs rounded-lg bg-primary hover:bg-primary/90 font-bold shrink-0"
            onClick={handleAccept}
            disabled={acceptHop.isPending}
            data-testid={`button-accept-panel-${hop.id}`}
          >
            {acceptHop.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Accept"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PickupNavigationView({ hop, driverLat, driverLng, onClose }: {
  hop: any;
  driverLat: number | null;
  driverLng: number | null;
  onClose: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { data: address } = useReverseGeocode(hop.startLat, hop.startLng);
  const [turnSteps, setTurnSteps] = useState<{ instruction: string; distance: string }[]>([]);
  const [navMapError, setNavMapError] = useState(false);
  const navMapErrorRef = useRef(false);
  const queryClient = useQueryClient();

  const hopLat = parseFloat(hop.startLat || "0");
  const hopLng = parseFloat(hop.startLng || "0");
  const endLat = parseFloat(hop.endLat || "0");
  const endLng = parseFloat(hop.endLng || "0");
  const coordsValid = isFinite(hopLat) && isFinite(hopLng) && hopLat !== 0 && hopLng !== 0;
  const hasDropoff = isFinite(endLat) && isFinite(endLng) && endLat !== 0 && endLng !== 0;

  const distance = (driverLat && driverLng && coordsValid)
    ? calcDistance(driverLat, driverLng, hopLat, hopLng)
    : null;

  useEffect(() => {
    if (!mapContainerRef.current || !driverLat || !driverLng || !coordsValid || navMapErrorRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/navigation-night-v1",
        center: [(driverLng + hopLng) / 2, (driverLat + hopLat) / 2],
        zoom: 13,
      });
    } catch (e) {
      console.warn("Nav map init failed:", e);
      navMapErrorRef.current = true;
      setNavMapError(true);
      return;
    }

    map.on("error", (e: any) => {
      if (e?.error?.message?.includes("WebGL")) {
        navMapErrorRef.current = true;
        setNavMapError(true);
        map.remove();
      }
    });

    mapRef.current = map;

    map.on("load", async () => {
      new mapboxgl.Marker({ color: "#22c55e" })
        .setLngLat([driverLng, driverLat])
        .setPopup(new mapboxgl.Popup().setText("You"))
        .addTo(map);

      new mapboxgl.Marker({ color: "#f97316" })
        .setLngLat([hopLng, hopLat])
        .setPopup(new mapboxgl.Popup().setText("Pickup"))
        .addTo(map);

      if (hasDropoff) {
        new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([endLng, endLat])
          .setPopup(new mapboxgl.Popup().setText("Dropoff"))
          .addTo(map);
      }

      try {
        const waypoints = hasDropoff
          ? `${driverLng},${driverLat};${hopLng},${hopLat};${endLng},${endLat}`
          : `${driverLng},${driverLat};${hopLng},${hopLat}`;
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&steps=true&access_token=${token}`
        );
        const json = await res.json();
        if (json.routes?.[0]) {
          map.addSource("route", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: json.routes[0].geometry },
          });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#3b82f6", "line-width": 5, "line-opacity": 0.85 },
          });

          const coords = json.routes[0].geometry.coordinates;
          const bounds = coords.reduce(
            (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
            new mapboxgl.LngLatBounds(coords[0], coords[0])
          );
          map.fitBounds(bounds, { padding: 60 });

          const steps: { instruction: string; distance: string }[] = [];
          for (const leg of json.routes[0].legs) {
            for (const step of leg.steps) {
              if (step.maneuver?.instruction) {
                const dist = step.distance < 160 ? `${Math.round(step.distance)}m` : `${(step.distance / 1609.34).toFixed(1)} mi`;
                steps.push({ instruction: step.maneuver.instruction, distance: dist });
              }
            }
          }
          setTurnSteps(steps.slice(0, 8));
        }
      } catch {}
    });

    return () => { map.remove(); };
  }, [driverLat, driverLng, hopLat, hopLng, endLat, endLng]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Card className="border-2 border-blue-400 bg-blue-50/30 dark:bg-blue-950/20 rounded-2xl overflow-hidden" data-testid="card-pickup-navigation">
        <CardContent className="p-0">
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Navigation className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {hop.status === "in_ride" ? "Navigating to Dropoff" : "Navigating to Pickup"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]" data-testid="text-nav-address">
                  {address || hop.startLocation}
                  {distance !== null && ` · ${distance < 0.1 ? "< 0.1" : distance.toFixed(1)} mi`}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={onClose} data-testid="button-close-nav">
              <X className="w-3 h-3 mr-1" /> Close
            </Button>
          </div>
          {navMapError ? (
            <div className="w-full h-[250px] bg-gradient-to-b from-blue-900/30 to-background flex items-center justify-center" data-testid="map-pickup-navigation">
              <div className="text-center opacity-60">
                <Navigation className="w-10 h-10 mx-auto mb-2 text-blue-400" />
                <p className="text-xs text-muted-foreground">Use "Open in Maps" below</p>
              </div>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-[250px]" data-testid="map-pickup-navigation" />
          )}

          {turnSteps.length > 0 && (
            <div className="px-3 py-2 max-h-[120px] overflow-y-auto" data-testid="turn-by-turn-steps">
              {turnSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 py-1 border-b border-border/20 last:border-0">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground leading-tight">{step.instruction}</p>
                    <p className="text-[9px] text-muted-foreground">{step.distance}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm rounded-xl"
                onClick={() => {
                  const dest = hop.status === "in_ride" && hasDropoff
                    ? `${endLat},${endLng}`
                    : `${hopLat},${hopLng}`;
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, "_blank");
                }}
                data-testid="button-open-maps"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Open in Maps
              </Button>
            </div>
            {hop.status === "matched" && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl"
                onClick={async () => {
                  try {
                    await apiRequest("POST", `/api/hops/${hop.id}/start-ride`);
                    queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
                    showFlash("🚗", "Ride started!", "success");
                  } catch {
                    showFlash("⚠️", "Couldn't start ride", "error");
                  }
                }}
                data-testid="button-driver-start-ride"
              >
                Hopper Picked Up - Start Ride
              </Button>
            )}
            {hop.status === "in_ride" && (
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl"
                onClick={async () => {
                  try {
                    await apiRequest("POST", `/api/hops/${hop.id}/complete`, {});
                    queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
                    showFlash("✅", "Ride completed!", "success");
                    onClose();
                  } catch {
                    showFlash("⚠️", "Couldn't complete ride", "error");
                  }
                }}
                data-testid="button-complete-ride"
              >
                Complete Ride
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const DEPARTURE_OPTIONS = [
  { value: 0, label: "Now" },
  { value: 5, label: "5m" },
  { value: 10, label: "10m" },
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 45, label: "45m" },
  { value: 60, label: "1hr" },
  { value: -1, label: "Custom" },
];

function QuickLocationButtons({ user, onSelectStart, onSelectEnd, mode }: { user: User; onSelectStart: (addr: string) => void; onSelectEnd: (addr: string) => void; mode: "hopper" | "driver" }) {
  const hasHome = !!(user as any).homeAddress;
  const hasWork = !!(user as any).workAddress;
  const hasCustom = !!(user as any).customLocationAddress;
  const [showSetup, setShowSetup] = useState<"home" | "work" | "custom" | null>(null);
  const queryClient = useQueryClient();

  const saveLoc = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("PUT", "/api/profile/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      showFlash("📍", "Location saved!", "success");
      setShowSetup(null);
    },
  });

  const [setupInput, setSetupInput] = useState("");

  const handleSave = () => {
    if (!setupInput.trim()) return;
    if (showSetup === "home") {
      saveLoc.mutate({ homeAddress: setupInput.trim(), homeLat: "", homeLng: "" });
    } else if (showSetup === "work") {
      saveLoc.mutate({ workAddress: setupInput.trim(), workLat: "", workLng: "" });
    } else if (showSetup === "custom") {
      saveLoc.mutate({ customLocationAddress: setupInput.trim(), customLocationName: "Fav", customLocationLat: "", customLocationLng: "" });
    }
  };

  const handleQuickFill = (type: "home_to_work" | "work_to_home") => {
    const homeAddr = (user as any).homeAddress;
    const workAddr = (user as any).workAddress;
    if (type === "home_to_work") {
      if (homeAddr) onSelectStart(homeAddr);
      if (workAddr) onSelectEnd(workAddr);
    } else {
      if (workAddr) onSelectStart(workAddr);
      if (homeAddr) onSelectEnd(homeAddr);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 flex-wrap">
        {hasHome && hasWork && (
          <>
            <button
              type="button"
              onClick={() => handleQuickFill("home_to_work")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all"
              data-testid={`button-${mode}-home-to-work`}
            >
              <Home className="w-3 h-3" />→<Briefcase className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("work_to_home")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-700/40 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-all"
              data-testid={`button-${mode}-work-to-home`}
            >
              <Briefcase className="w-3 h-3" />→<Home className="w-3 h-3" />
            </button>
          </>
        )}
        {hasHome && (
          <button
            type="button"
            onClick={() => onSelectEnd((user as any).homeAddress)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all"
            data-testid={`button-${mode}-home`}
          >
            <Home className="w-3 h-3" /> Home
          </button>
        )}
        {hasWork && (
          <button
            type="button"
            onClick={() => onSelectEnd((user as any).workAddress)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all"
            data-testid={`button-${mode}-work`}
          >
            <Briefcase className="w-3 h-3" /> Work
          </button>
        )}
        {hasCustom && (
          <button
            type="button"
            onClick={() => onSelectEnd((user as any).customLocationAddress)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all"
            data-testid={`button-${mode}-custom`}
          >
            <Star className="w-3 h-3" /> {(user as any).customLocationName || "Fav"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowSetup(showSetup ? null : (!hasHome ? "home" : !hasWork ? "work" : "custom"))}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all"
          data-testid={`button-${mode}-set-location`}
        >
          <Settings2 className="w-3 h-3" /> {!hasHome ? "Set Home" : !hasWork ? "Set Work" : "Edit"}
        </button>
      </div>

      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 rounded-lg bg-muted/40 border border-border/50 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  {(["home", "work", "custom"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setShowSetup(t); setSetupInput(t === "home" ? ((user as any).homeAddress || "") : t === "work" ? ((user as any).workAddress || "") : ((user as any).customLocationAddress || "")); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${showSetup === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                      data-testid={`button-${mode}-setup-${t}`}
                    >
                      {t === "home" ? "🏠 Home" : t === "work" ? "💼 Work" : "⭐ Custom"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder={showSetup === "home" ? "Home address" : showSetup === "work" ? "Work address" : "Custom address"}
                  value={setupInput}
                  onChange={(e) => setSetupInput(e.target.value)}
                  className="h-8 text-xs rounded-lg flex-1"
                  data-testid={`input-${mode}-setup-address`}
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!setupInput.trim() || saveLoc.isPending}
                  className="h-8 px-2 text-xs"
                  data-testid={`button-${mode}-save-location`}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSetup(null)}
                  className="h-8 px-2 text-xs"
                  data-testid={`button-${mode}-cancel-setup`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DriveNowPanel({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const geo = useGeolocation();
  const [navigatingHop, setNavigatingHop] = useState<any>(null);
  const [driverStartInput, setDriverStartInput] = useState("");
  const [driverDestInput, setDriverDestInput] = useState("");
  const [driverDepartureMin, setDriverDepartureMin] = useState<number | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [routeGenerated, setRouteGenerated] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string } | null>(null);
  const [activating, setActivating] = useState(false);

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

  const activeDriverHop = hops?.find(h => h.status === 'matched' || h.status === 'in_ride');

  useLiveLocationBroadcast(isActiveNow || !!activeDriverHop);

  useEffect(() => {
    if (!geo.permitted) geo.requestPermission();
  }, [geo.permitted]);

  useEffect(() => {
    if (activeDriverHop && !navigatingHop) {
      setNavigatingHop(activeDriverHop);
    }
  }, [activeDriverHop]);

  const generateRoute = async () => {
    if (!driverDestInput.trim()) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !geo.latitude || !geo.longitude) {
      showFlash("📍", "Enable location access", "error");
      return;
    }
    try {
      const endQuery = encodeURIComponent(driverDestInput + ", Lexington, KY");
      const endRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${endQuery}.json?access_token=${token}&limit=1`);
      const endJson = await endRes.json();
      if (!endJson.features?.length) {
        showFlash("⚠️", "Can't find destination", "error");
        return;
      }
      const [endLng, endLat] = endJson.features[0].center;
      const directionsRes = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${geo.longitude},${geo.latitude};${endLng},${endLat}?geometries=geojson&access_token=${token}`
      );
      const directionsJson = await directionsRes.json();
      if (!directionsJson.routes?.length) {
        showFlash("⚠️", "Can't calculate route", "error");
        return;
      }
      const route = directionsJson.routes[0];
      const distMiles = (route.distance / 1609.34).toFixed(1);
      const etaMins = Math.round(route.duration / 60);
      setRouteInfo({ distance: `${distMiles} mi`, eta: `${etaMins} min` });
      setRouteGenerated(true);
      showFlash("🗺️", `Route: ${distMiles} mi · ${etaMins} min`, "success");
    } catch {
      showFlash("⚠️", "Error calculating route", "error");
    }
  };

  useEffect(() => {
    if (driverDestInput.trim().length > 2) {
      const timer = setTimeout(generateRoute, 800);
      return () => clearTimeout(timer);
    } else {
      setRouteGenerated(false);
      setRouteInfo(null);
    }
  }, [driverDestInput, geo.latitude, geo.longitude]);

  const canGoActive = driverDestInput.trim().length > 0 && routeGenerated && driverDepartureMin !== null;

  const handleGoActive = async () => {
    if (!canGoActive) return;
    setActivating(true);
    try {
      toggleActive.mutate(true);
    } finally {
      setActivating(false);
    }
  };

  const handleSelectDeparture = (val: number) => {
    if (val === -1) {
      setShowCustomTime(true);
      setDriverDepartureMin(null);
    } else {
      setShowCustomTime(false);
      setDriverDepartureMin(val);
    }
  };

  const handleCustomTimeConfirm = () => {
    if (!customTimeInput.trim()) return;
    const match = customTimeInput.trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
    if (!match) {
      showFlash("⚠️", "Use format like 3:30 PM or 15:30", "error");
      return;
    }
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      showFlash("⚠️", "Invalid time", "error");
      return;
    }
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
    setDriverDepartureMin(diffMin);
    setShowCustomTime(false);
    showFlash("⏰", `Departing at ${customTimeInput.trim()}`, "success");
  };

  if (navigatingHop) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-extrabold text-foreground/70 text-center flex-1" data-testid="text-driver-greeting">
            happy driving,{" "}
            <span className="text-foreground font-black">{user.username}</span>
          </p>
          <a
            href="tel:8594202312"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all active:scale-95"
            title="Call for help: (859) 420-2312"
            data-testid="button-call-help"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
        <PickupNavigationView
          hop={navigatingHop}
          driverLat={geo.latitude}
          driverLng={geo.longitude}
          onClose={() => setNavigatingHop(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-extrabold text-foreground/70 text-center flex-1" data-testid="text-driver-greeting">
          happy driving,{" "}
          <span className="text-foreground font-black">{user.username}</span>
        </p>
        <a
          href="tel:8594202312"
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all active:scale-95"
          title="Call for help: (859) 420-2312"
          data-testid="button-call-help"
        >
          <Phone className="w-5 h-5" />
        </a>
      </div>

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

      {isVerified && isActiveNow && (
        <Card className="border-2 border-green-400 bg-green-50/30 dark:bg-green-950/20 rounded-2xl" data-testid="card-active-toggle">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600">
                  <Power className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">You're Active</p>
                  <p className="text-[10px] text-muted-foreground">
                    Waiting for a match · {(user as any)?.availableSeats || 1} seat{((user as any)?.availableSeats || 1) > 1 ? "s" : ""} open
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => toggleActive.mutate(false)}
                disabled={toggleActive.isPending}
                data-testid="button-toggle-active"
              >
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isVerified && !isActiveNow && (
        <div className="space-y-2">
          <QuickLocationButtons
            user={user}
            mode="driver"
            onSelectStart={(addr) => setDriverStartInput(addr)}
            onSelectEnd={(addr) => setDriverDestInput(addr)}
          />
          <div className="space-y-1.5">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <div
                className="h-11 text-sm font-bold rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-700/40 pl-9 pr-3 flex items-center justify-between text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                data-testid="display-driver-start"
                onClick={() => driverStartInput === "" && setDriverStartInput("🌍 Current Location")}
              >
                <span>{driverStartInput || "Select starting point..."}</span>
              </div>
            </div>
            {driverStartInput && (
              <div className="flex gap-1 flex-wrap px-1">
                <button
                  type="button"
                  onClick={() => setDriverStartInput("🌍 Current Location")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    driverStartInput === "🌍 Current Location"
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid="button-driver-start-current"
                >
                  🌍 Current
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt("Enter starting location:");
                    if (custom?.trim()) setDriverStartInput(custom.trim());
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-muted/50 text-muted-foreground hover:bg-muted transition-all"
                  data-testid="button-driver-start-custom"
                >
                  + Custom
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm bg-orange-500" />
            <Input
              placeholder="Where are you headed?"
              className="h-11 text-sm rounded-xl bg-muted/40 border-border/50 pl-9 focus:bg-background font-semibold"
              value={driverDestInput}
              onChange={(e) => setDriverDestInput(e.target.value)}
              data-testid="input-driver-destination"
            />
          </div>

          {routeGenerated && routeInfo && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 rounded-lg p-2 border border-green-200/50 dark:border-green-700/30">
              <Navigation className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-[11px] font-bold text-green-700 dark:text-green-400">Route: {routeInfo.distance} · {routeInfo.eta}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground">How long until you head out?</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {DEPARTURE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectDeparture(opt.value)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    (opt.value === -1 && showCustomTime) || (opt.value !== -1 && driverDepartureMin === opt.value)
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid={`button-driver-depart-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {showCustomTime && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g. 3:30 PM"
                  className="h-8 text-xs rounded-lg flex-1"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  data-testid="input-driver-custom-time"
                />
                <Button size="sm" className="h-8 text-xs rounded-lg" onClick={handleCustomTimeConfirm} data-testid="button-driver-custom-time-confirm">
                  Set
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-1 py-1.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-medium text-foreground">Seats</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="stepper-driver-seats">
              <Button
                size="sm"
                variant="outline"
                className="w-7 h-7 p-0 rounded-lg text-sm font-bold"
                data-testid="button-driver-seats-minus"
                disabled={(user as any)?.availableSeats <= 1}
                onClick={() => {
                  const current = (user as any)?.availableSeats || 1;
                  if (current > 1) updatePreferences.mutate({ availableSeats: current - 1 });
                }}
              >
                −
              </Button>
              <span className="text-sm font-bold w-5 text-center" data-testid="text-driver-seats-value">{(user as any)?.availableSeats || 1}</span>
              <Button
                size="sm"
                variant="outline"
                className="w-7 h-7 p-0 rounded-lg text-sm font-bold"
                data-testid="button-driver-seats-plus"
                disabled={(user as any)?.availableSeats >= 6}
                onClick={() => {
                  const current = (user as any)?.availableSeats || 1;
                  if (current < 6) updatePreferences.mutate({ availableSeats: current + 1 });
                }}
              >
                +
              </Button>
            </div>
          </div>

          <Button
            className={`w-full h-12 rounded-2xl font-black text-base shadow-xl transition-all ${
              canGoActive
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
            onClick={handleGoActive}
            disabled={!canGoActive || activating || toggleActive.isPending}
            data-testid="button-driver-go-active"
          >
            {activating || toggleActive.isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Activating...</>
            ) : (
              <><Power className="w-5 h-5 mr-2" /> GO ACTIVE</>
            )}
          </Button>

          {!canGoActive && driverDestInput.trim().length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">
              {!routeGenerated ? "Calculating route..." : !driverDepartureMin && driverDepartureMin !== 0 ? "Select departure time" : ""}
            </p>
          )}
        </div>
      )}

    </div>
  );
}

const AUTO_NOTIF_KEY = "sh-driver-auto-notify";

const DETOUR_DISMISS_KEY = "sh-detour-notice-dismissed";

function DriverAutoNotificationsEffect({ hopsCount }: { hopsCount: number }) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(AUTO_NOTIF_KEY) === "true"; } catch { return false; }
  });
  const [detourDismissed, setDetourDismissed] = useState(() => {
    try { return localStorage.getItem(DETOUR_DISMISS_KEY) === "true"; } catch { return false; }
  });
  const prevCountRef = useRef(hopsCount);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    function onStorageChange() {
      try { setEnabled(localStorage.getItem(AUTO_NOTIF_KEY) === "true"); } catch {}
    }
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("sh-auto-alert-change", onStorageChange);
    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("sh-auto-alert-change", onStorageChange);
    };
  }, []);

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

  if (detourDismissed) return null;

  return (
    <Card className="border-border/50 bg-blue-50/30 dark:bg-blue-950/10 rounded-2xl" data-testid="card-detour-notice">
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">💡</div>
          <p className="text-[10px] leading-relaxed text-muted-foreground flex-1">
            <span className="font-semibold text-foreground">Detours increase your chances of getting a hopper</span> along your route. You can take small detours and still head in the same direction—more flexibility means more hops!
          </p>
          <button
            onClick={() => {
              setDetourDismissed(true);
              try { localStorage.setItem(DETOUR_DISMISS_KEY, "true"); } catch {}
            }}
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            data-testid="button-dismiss-detour"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function InstaHopView({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const cancelHop = useCancelHop();
  const geo = useGeolocation();
  const [greetingVisible, setGreetingVisible] = useState(true);

  const updatePreferences = useMutation({
    mutationFn: async (updates: { seatsNeeded?: number }) => {
      await apiRequest("PATCH", "/api/user/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
  });
  const [mode, setMode] = useState<HopMode>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get("mode");
      if (urlMode === "drive") return "drive";
      if (urlMode === "hop") return "hop";
      return localStorage.getItem("sh-active-tab") === "driver" ? "drive" : "hop";
    } catch { return "hop"; }
  });
  const [isMatching, setIsMatching] = useState(false);
  const [magicGpsSuggestion, setMagicGpsSuggestion] = useState<{
    type: "route_match" | "driving_detected" | "walking_detected";
    routeName?: string;
    routeId?: number;
  } | null>(null);
  const [magicGpsActivation, setMagicGpsActivation] = useState<{ routeName: string } | null>(null);
  const [flowModeNotif, setFlowModeNotif] = useState<string | null>(null);
  const [driftCatchVisible, setDriftCatchVisible] = useState(false);
  const [repeatRouteVisible, setRepeatRouteVisible] = useState(true);
  const [onTheWayPingVisible, setOnTheWayPingVisible] = useState(false);

  const magicGpsActiveForHopper = false;

  const { data: magicGpsRoutes = [] } = useQuery<SavedRoute[]>({
    queryKey: ['/api/saved-routes'],
    enabled: magicGpsActiveForHopper,
  });

  const handleMagicGpsSuggestion = useCallback((match: SavedRouteMatch | null, movementType: "walking" | "driving") => {
    if (isMatching) return;
    const isDriver = mode === "drive";

    if (match) {
      setMagicGpsSuggestion({
        type: "route_match",
        routeName: match.routeName,
        routeId: match.routeId,
      });
    } else if (isDriver && movementType === "driving") {
      setMagicGpsSuggestion({ type: "driving_detected" });
    } else if (!isDriver && movementType === "walking") {
      setMagicGpsSuggestion({ type: "walking_detected" });
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const title = match
          ? (isDriver ? "✨ MagicGPS Suggestion" : "👣 MagicGPS Suggestion")
          : (isDriver ? "✨ MagicGPS Active" : "👣 MagicGPS Check-In");
        const body = match
          ? `Hey, are you headed to '${match.routeName}'?`
          : (isDriver ? "Looks like you're headed somewhere... Turn this trip into earnings?" : "You headed somewhere? Need a hop?");
        new Notification(title, { body, icon: "/favicon.png", tag: "magicgps" });
      } catch {}
    }
  }, [isMatching, mode]);

  const handleFlowModeActivate = useCallback((match: SavedRouteMatch) => {
    setFlowModeNotif(match.routeName);
    showFlash("🌊", "Flow Mode activated silently", "success");
    if (match.routeId) {
      apiRequest("POST", `/api/saved-routes/${match.routeId}/confirm`).catch(() => {});
    }
    const now = new Date();
    apiRequest("POST", "/api/activity-window", {
      dayOfWeek: now.getDay(),
      startHour: now.getHours(),
      endHour: Math.min(now.getHours() + 1, 23),
    }).catch(() => {});
    setTimeout(() => setFlowModeNotif(null), 5000);
  }, []);

  const handleDriftCatch = useCallback(() => {
    if (mode === "drive" || isMatching) return;
    setDriftCatchVisible(true);
  }, [mode, isMatching]);

  const { gpsState, declineSuggestion } = useMagicGps({
    enabled: magicGpsActiveForHopper,
    flowModeEnabled: magicGpsActiveForHopper && !!user.flowModeEnabled,
    savedRoutes: magicGpsRoutes,
    onSuggestion: handleMagicGpsSuggestion,
    onFlowModeActivate: handleFlowModeActivate,
    onDriftCatch: handleDriftCatch,
  });

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

  const [proximityAlerted, setProximityAlerted] = useState<{ pickup: boolean; dropoff: boolean }>({ pickup: false, dropoff: false });
  const proximityAudioRef = useRef<HTMLAudioElement | null>(null);

  const hasActiveRide = !!(activeHop && (activeHop.status === "matched" || activeHop.status === "in_ride"));
  useLiveLocationBroadcast(hasActiveRide || mode === "drive");
  const tracking = useHopTracking(activeHop?.id, hasActiveRide);

  useEffect(() => {
    if (!hasActiveRide || !tracking.available || !tracking.distance) return;

    if (tracking.distance <= 0.1 && !proximityAlerted.pickup && tracking.hopStatus === "matched") {
      setProximityAlerted(prev => ({ ...prev, pickup: true }));
      if (!proximityAudioRef.current) {
        proximityAudioRef.current = new Audio("/driver-approaching-alert.m4a");
        proximityAudioRef.current.volume = 0.9;
      }
      proximityAudioRef.current.currentTime = 0;
      proximityAudioRef.current.play().catch(() => {});
      showFlash("🚗", "Your driver is approaching!", "success");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Short Hop", { body: "Your driver is approaching the pickup!", icon: "/favicon.png", tag: "sh-proximity" });
      }
    }

    if (tracking.hopStatus === "in_ride" && tracking.dropoffLat && tracking.dropoffLng && tracking.partnerLat && tracking.partnerLng) {
      const distToDropoff = calcDistance(tracking.partnerLat, tracking.partnerLng, tracking.dropoffLat, tracking.dropoffLng);
      if (distToDropoff <= 0.1 && !proximityAlerted.dropoff) {
        setProximityAlerted(prev => ({ ...prev, dropoff: true }));
        if (!proximityAudioRef.current) {
          proximityAudioRef.current = new Audio("/driver-approaching-alert.m4a");
          proximityAudioRef.current.volume = 0.9;
        }
        proximityAudioRef.current.currentTime = 0;
        proximityAudioRef.current.play().catch(() => {});
        showFlash("📍", "Approaching your destination!", "success");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Short Hop", { body: "Almost at your destination!", icon: "/favicon.png", tag: "sh-proximity-dropoff" });
        }
      }
    }
  }, [hasActiveRide, tracking, proximityAlerted]);

  useEffect(() => {
    if (!hasActiveRide) {
      setProximityAlerted({ pickup: false, dropoff: false });
    }
  }, [hasActiveRide]);

  useEffect(() => {
    if (mode === "drive" || activeHop || !user.magicGpsEnabled || !magicGpsActiveForHopper) return;
    const checkNearby = async () => {
      try {
        const res = await fetch("/api/on-the-way", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.driversNearby && !onTheWayPingVisible) {
            setOnTheWayPingVisible(true);
          }
        }
      } catch {}
    };
    const interval = setInterval(checkNearby, 30000);
    checkNearby();
    return () => clearInterval(interval);
  }, [mode, activeHop, user.magicGpsEnabled, onTheWayPingVisible]);

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
  const [pricePreview, setPricePreview] = useState<{
    distanceMiles: number;
    etaMinutes: number;
    priceCents: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    startName: string;
    endName: string;
    routeGeometry: any;
  } | null>(null);
  const [prepaidInfo, setPrepaidInfo] = useState<{
    amount: number;
    paymentIntentId: string;
    departureTime: string;
    arrivalDeadline: string;
    timeWindowExpiry: string;
    distanceMiles: number;
  } | null>(null);
  const [matchCountdown, setMatchCountdown] = useState<number | null>(null);
  const [paymentRefunded, setPaymentRefunded] = useState(false);
  const [departureMinutes, setDepartureMinutes] = useState(0);


  useEffect(() => {
    if (!prepaidInfo || !isMatching) {
      setMatchCountdown(null);
      return;
    }
    const expiryTime = new Date(prepaidInfo.timeWindowExpiry).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setMatchCountdown(remaining);
      if (remaining <= 0) {
        if (activeHop && activeHop.status === "requested") {
          cancelHop.mutate(activeHop.id);
        }
        setIsMatching(false);
        setPrepaidInfo(null);
        setPaymentRefunded(true);
        showFlash("⏰", "Time window expired — payment released, no charge", "info");
        queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [prepaidInfo, isMatching]);

  const onSubmit = async (data: z.infer<typeof searchSchema>) => {
    if (mode === "walk") {
      showFlash("🚶", "GPS navigation starting...", "info");
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !data.endLocation) {
      showFlash("⚠️", "Need location data", "error");
      return;
    }

    try {
      let startLat: number;
      let startLng: number;
      let resolvedStartName = data.startLocation;

      const useGps = !data.startLocation || data.startLocation.toLowerCase().includes("current");

      if (useGps) {
        if (!geo.latitude || !geo.longitude) {
          showFlash("📍", "Enable location access to use current location", "error");
          return;
        }
        startLat = geo.latitude;
        startLng = geo.longitude;
        try {
          const revRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${startLng},${startLat}.json?access_token=${token}&limit=1&types=address`);
          const revJson = await revRes.json();
          if (revJson.features?.length) {
            resolvedStartName = revJson.features[0].place_name?.split(",")[0] || "Current location";
          } else {
            resolvedStartName = "Current location";
          }
        } catch {
          resolvedStartName = "Current location";
        }
      } else {
        const startQuery = encodeURIComponent(data.startLocation + ", Lexington, KY");
        const startRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${startQuery}.json?access_token=${token}&limit=1`);
        const startJson = await startRes.json();
        if (!startJson.features?.length) {
          showFlash("⚠️", "Can't find pickup location", "error");
          return;
        }
        [startLng, startLat] = startJson.features[0].center;
      }

      const endQuery = encodeURIComponent(data.endLocation + ", Lexington, KY");
      const endRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${endQuery}.json?access_token=${token}&limit=1`);
      const endJson = await endRes.json();
      if (!endJson.features?.length) {
        showFlash("⚠️", "Can't find destination", "error");
        return;
      }
      const [endLng, endLat] = endJson.features[0].center;

      const directionsRes = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&steps=true&access_token=${token}`
      );
      const directionsJson = await directionsRes.json();
      if (!directionsJson.routes?.length) {
        showFlash("⚠️", "Can't calculate route", "error");
        return;
      }

      const route = directionsJson.routes[0];
      const distanceMiles = route.distance / 1609.34;
      const etaMinutes = Math.round(route.duration / 60);

      if (distanceMiles > 10) {
        setTooFarForInstahop(true);
        showFlash("📅", "Use Plan a Ride for trips over 10 miles", "info");
        return;
      }

      const priceCents = Math.max(Math.round(distanceMiles * 100), 100);

      setPricePreview({
        distanceMiles,
        etaMinutes,
        priceCents,
        startLat,
        startLng,
        endLat,
        endLng,
        startName: resolvedStartName,
        endName: data.endLocation,
        routeGeometry: route.geometry,
      });
    } catch (e) {
      showFlash("⚠️", "Error calculating route", "error");
    }
  };

  const confirmAndPay = async () => {
    if (!pricePreview) return;
    const data = form.getValues();

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

    setPaymentRefunded(false);
    try {
      const authRes = await apiRequest("POST", "/api/stripe/authorize-hop", {
        distanceMiles: pricePreview.distanceMiles,
        departureTime: new Date(Date.now() + departureMinutes * 60000).toISOString(),
        arrivalDeadline: new Date(Date.now() + (departureMinutes + 45) * 60000).toISOString(),
      });
      const authData = await authRes.json();

      setPrepaidInfo({
        amount: authData.amount,
        paymentIntentId: authData.paymentIntentId,
        departureTime: authData.departureTime,
        arrivalDeadline: authData.arrivalDeadline,
        timeWindowExpiry: authData.timeWindowExpiry,
        distanceMiles: pricePreview.distanceMiles,
      });

      setIsMatching(true);
      setPricePreview(null);
      const hopData: any = {
        ...data,
        startLocation: pricePreview.startName,
        hopType: 'short_hop',
        distanceMiles: pricePreview.distanceMiles,
        startLat: String(pricePreview.startLat),
        startLng: String(pricePreview.startLng),
        endLat: String(pricePreview.endLat),
        endLng: String(pricePreview.endLng),
        paymentIntentId: authData.paymentIntentId,
        paymentStatus: "authorized",
        paymentAmountCents: authData.amount,
        departureTime: authData.departureTime,
        arrivalDeadline: authData.arrivalDeadline,
        timeWindowExpiry: authData.timeWindowExpiry,
      };

      requestHop.mutate(hopData, {
        onSuccess: () => {
          showFlash("⚡", "Paid & requesting your hop!", "success");
        },
        onError: () => {
          setIsMatching(false);
          setPrepaidInfo(null);
        }
      });
    } catch (authErr: any) {
      showFlash("❌", authErr.message || "Payment failed", "error");
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
    setPrepaidInfo(null);
    if (activeHop && activeHop.status === "requested") {
      cancelHop.mutate(activeHop.id);
      showFlash("✅", "Cancelled — payment authorization released", "info");
    }
  }

  return (
    <>
      <AnimatePresence>
        {magicGpsSuggestion && (
          <MagicGpsSuggestion
            type={magicGpsSuggestion.type}
            routeName={magicGpsSuggestion.routeName}
            isDriver={mode === "drive"}
            onAccept={() => {
              if (magicGpsSuggestion.type === "route_match" && magicGpsSuggestion.routeName) {
                if (mode === "drive") {
                  setMagicGpsActivation({ routeName: magicGpsSuggestion.routeName });
                  if (magicGpsSuggestion.routeId) {
                    apiRequest("POST", `/api/saved-routes/${magicGpsSuggestion.routeId}/confirm`).catch(() => {});
                  }
                } else {
                  setLocation("/instahop");
                  showFlash("🚗", "Looking for a hop...", "info");
                }
              } else if (magicGpsSuggestion.type === "driving_detected") {
                setMagicGpsActivation({ routeName: "your destination" });
              } else {
                setLocation("/instahop");
                showFlash("🚗", "Looking for a hop...", "info");
              }
              setMagicGpsSuggestion(null);
            }}
            onDismiss={() => {
              setMagicGpsSuggestion(null);
              declineSuggestion();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {magicGpsActivation && (
          <MagicGpsActivation
            routeName={magicGpsActivation.routeName}
            onActivate={() => {
              showFlash("💰", "Auto-Hop activated! Searching for riders...", "success");
            }}
            onClose={() => setMagicGpsActivation(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flowModeNotif && (
          <FlowModeNotification routeName={flowModeNotif} onDismiss={() => setFlowModeNotif(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {driftCatchVisible && (
          <DriftCatchNotification
            onRequestHop={() => {
              setDriftCatchVisible(false);
              showFlash("🚗", "Looking for a hop...", "info");
            }}
            onDismiss={() => setDriftCatchVisible(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {onTheWayPingVisible && !activeHop && (
          <OnTheWayPing
            onRequestHop={() => {
              setOnTheWayPingVisible(false);
              showFlash("🚗", "Looking for a hop...", "info");
            }}
            onDismiss={() => setOnTheWayPingVisible(false)}
          />
        )}
      </AnimatePresence>

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
                <div className="flex gap-2 mb-2 items-start">
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

                  <a
                    href="tel:8594202312"
                    className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all active:scale-95"
                    title="Call for help: (859) 420-2312"
                    data-testid="button-call-help-hopper"
                  >
                    <Phone className="w-5 h-5" />
                  </a>

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

                {pricePreview && !isMatching && (
                  <Card className="border-green-500/40 bg-gradient-to-br from-green-500/5 to-transparent mb-2" data-testid="card-price-preview">
                    <CardContent className="py-3 px-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground">Trip Summary</p>
                        <button onClick={() => setPricePreview(null)} className="text-muted-foreground hover:text-foreground" data-testid="button-close-preview">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <p className="text-xs text-muted-foreground truncate">{pricePreview.startName || "Current location"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm bg-orange-500" />
                          <p className="text-xs text-muted-foreground truncate">{pricePreview.endName}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3">
                        <div className="text-center">
                          <p className="text-lg font-black text-foreground" data-testid="text-preview-distance">{pricePreview.distanceMiles.toFixed(1)} mi</p>
                          <p className="text-[10px] text-muted-foreground">distance</p>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center">
                          <p className="text-lg font-black text-foreground" data-testid="text-preview-eta">{pricePreview.etaMinutes} min</p>
                          <p className="text-[10px] text-muted-foreground">est. time</p>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center">
                          <p className="text-lg font-black text-green-600 dark:text-green-400" data-testid="text-preview-price">${(pricePreview.priceCents / 100).toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">total</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">$1.00/mile · $1.00 minimum · charged immediately</p>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm h-11 rounded-xl"
                        onClick={confirmAndPay}
                        disabled={requestHop.isPending}
                        data-testid="button-confirm-pay"
                      >
                        {requestHop.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        Confirm & Pay ${(pricePreview.priceCents / 100).toFixed(2)}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {hasActiveRide && (
                  <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent mb-2" data-testid="card-active-ride">
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {activeHop?.status === "matched" ? (
                            <>
                              <Car className="w-4 h-4 text-primary" />
                              Driver on the way
                            </>
                          ) : (
                            <>
                              <Navigation className="w-4 h-4 text-green-500" />
                              In Ride
                            </>
                          )}
                        </p>
                        {tracking.available && tracking.distance !== null && (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full" data-testid="text-tracking-distance">
                            {tracking.distance < 0.1 ? "< 0.1 mi" : `${tracking.distance.toFixed(1)} mi`} away
                          </span>
                        )}
                      </div>

                      {tracking.pickupSide && activeHop?.status === "matched" && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 border border-blue-200/50 dark:border-blue-700/30" data-testid="display-pickup-side">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">{tracking.pickupSide}</p>
                        </div>
                      )}

                      {tracking.available && tracking.direction && (
                        <p className="text-xs text-muted-foreground">
                          Driver heading {tracking.direction} toward you
                        </p>
                      )}

                      {activeHop?.status === "matched" && (
                        <Button
                          size="sm"
                          className="w-full text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                          onClick={async () => {
                            try {
                              await apiRequest("POST", `/api/hops/${activeHop.id}/start-ride`);
                              queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
                              showFlash("🚗", "Ride started!", "success");
                            } catch {
                              showFlash("⚠️", "Couldn't start ride", "error");
                            }
                          }}
                          data-testid="button-start-ride"
                        >
                          Confirm Pickup - Start Ride
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!isMatching && !pricePreview && !hasActiveRide && mode === "hop" && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mb-1 bg-gray-50 dark:bg-gray-950/20 text-muted-foreground border border-border/30" data-testid="display-driver-availability">
                    <Car className="w-3.5 h-3.5 shrink-0" />
                    <span>Submit your request — we'll match you when a driver is available</span>
                  </div>
                )}

                {isMatching && prepaidInfo && (
                  <Card className="border-blue-500/40 bg-gradient-to-br from-blue-500/10 to-transparent mb-2" data-testid="card-matching-countdown">
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> No drivers available yet — waiting for a match
                        </p>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400" data-testid="text-payment-amount">
                          ${(prepaidInfo.amount / 100).toFixed(2)} authorized
                        </span>
                      </div>
                      {matchCountdown !== null && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time remaining</span>
                            <span className="font-mono font-bold text-foreground" data-testid="text-match-countdown">
                              {Math.floor(matchCountdown / 60)}:{String(matchCountdown % 60).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="w-full bg-muted/30 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${matchCountdown < 120 ? 'bg-red-500' : matchCountdown < 300 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(100, (matchCountdown / 1800) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Payment confirmed. Waiting for a match. Refunded if no match found.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={async () => {
                          if (activeHop) {
                            cancelHop.mutate(activeHop.id);
                          }
                          setIsMatching(false);
                          setPrepaidInfo(null);
                          showFlash("✅", "Cancelled — payment authorization released", "info");
                        }}
                        data-testid="button-cancel-matching"
                      >
                        Cancel & Refund
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {paymentRefunded && !isMatching && (
                  <Card className="border-green-500/40 bg-gradient-to-br from-green-500/10 to-transparent mb-2" data-testid="card-payment-refunded">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">Payment Refunded</p>
                        <p className="text-xs text-muted-foreground">No match found — your payment has been refunded.</p>
                      </div>
                      <button onClick={() => setPaymentRefunded(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </CardContent>
                  </Card>
                )}

                <QuickLocationButtons
                  user={user}
                  mode="hopper"
                  onSelectStart={(addr) => form.setValue("startLocation", addr)}
                  onSelectEnd={(addr) => form.setValue("endLocation", addr)}
                />

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                        <div
                          className="h-11 text-sm font-bold rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-700/40 pl-9 pr-3 flex items-center justify-between text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                          data-testid="display-instahop-start"
                          onClick={() => form.watch("startLocation") === "" && form.setValue("startLocation", "🌍 Current Location")}
                        >
                          <span>{form.watch("startLocation") || "Select starting point..."}</span>
                          {walkingInfo && form.watch("startLocation") && (
                            <span className="text-[10px] font-semibold text-orange-500 shrink-0 ml-2">{walkingInfo.duration} · {walkingInfo.distance}</span>
                          )}
                        </div>
                        <input type="hidden" {...form.register("startLocation")} />
                      </div>
                      {form.watch("startLocation") && (
                        <div className="flex gap-1 flex-wrap px-1">
                          <button
                            type="button"
                            onClick={() => form.setValue("startLocation", "🌍 Current Location")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              form.watch("startLocation") === "🌍 Current Location"
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                            data-testid="button-hopper-start-current"
                          >
                            🌍 Current
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const custom = prompt("Enter starting location:");
                              if (custom?.trim()) form.setValue("startLocation", custom.trim());
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-muted/50 text-muted-foreground hover:bg-muted transition-all"
                            data-testid="button-hopper-start-custom"
                          >
                            + Custom
                          </button>
                        </div>
                      )}
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

                  {mode === "hop" && !isMatching && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">Depart in</span>
                        <div className="flex flex-wrap gap-1">
                          {DEPARTURE_OPTIONS.filter(o => o.value !== -1).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDepartureMinutes(opt.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                departureMinutes === opt.value
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
                              }`}
                              data-testid={`button-depart-${opt.value}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground">Seats</span>
                        </div>
                        <div className="flex items-center gap-1.5" data-testid="stepper-hopper-seats">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-7 h-7 p-0 rounded-lg text-sm font-bold"
                            data-testid="button-hopper-seats-minus"
                            disabled={(user as any)?.seatsNeeded <= 1}
                            onClick={() => {
                              const current = (user as any)?.seatsNeeded || 1;
                              if (current > 1) updatePreferences.mutate({ seatsNeeded: current - 1 });
                            }}
                          >
                            −
                          </Button>
                          <span className="text-sm font-bold w-5 text-center" data-testid="text-hopper-seats-value">{(user as any)?.seatsNeeded || 1}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-7 h-7 p-0 rounded-lg text-sm font-bold"
                            data-testid="button-hopper-seats-plus"
                            disabled={(user as any)?.seatsNeeded >= 6}
                            onClick={() => {
                              const current = (user as any)?.seatsNeeded || 1;
                              if (current < 6) updatePreferences.mutate({ seatsNeeded: current + 1 });
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

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
                          {requestHop.isPending ? 'Finding...' : 'Request Ride'}
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
