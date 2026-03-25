import { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Navigation, Bookmark, MapPin, Mail, Car, X, Shield, Clock, AlertTriangle, Power, Bell, BellOff, Users, Home, Briefcase, Star, Settings2, Check, MessageCircle, Send, Square, Timer, DollarSign, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHops, useRequestHop, useCancelHop, useAcceptHop } from "@/hooks/use-hops";
import { useGeolocation, useLiveLocationBroadcast, useHopTracking } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { getDriverSoundDuration } from "@/lib/sounds";
import { useMagicGps, type SavedRouteMatch } from "@/hooks/use-magic-gps";
import { useTheme } from "@/components/ThemeProvider";
import { MagicGpsSuggestion, MagicGpsActivation, MagicGpsStatus, FlowModeNotification, RepeatRoutePrompt } from "@/components/MagicGpsNotification";
import type { SavedRoute } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { User } from "@shared/routes";
import driverAloneUrl from "@assets/Untitled_design_1773938700510.png";
import hopperAloneUrl from "@assets/Untitled_design_1773938781771.png";
import driverWithHopperUrl from "@assets/Untitled_design_1773938803778.png";

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

let _autoCompleteIdCounter = 0;

function AddressAutocomplete({ value, onChange, placeholder, className, dataTestId }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  dataTestId?: string;
}) {
  const [suggestions, setSuggestions] = useState<{ place_name: string; text: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const uniqueId = useRef(`ac-${++_autoCompleteIdCounter}`).current;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const updateDropdownPos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    const onScroll = () => updateDropdownPos();
    const onResize = () => updateDropdownPos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [showSuggestions, updateDropdownPos]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const dropdown = document.getElementById(uniqueId);
        if (dropdown && dropdown.contains(e.target as Node)) return;
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [uniqueId]);

  const fetchSuggestions = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const encoded = encodeURIComponent(query + ", Lexington, KY");
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=5&country=US&proximity=-84.5037,38.0406&bbox=-84.65,37.90,-84.35,38.15&types=address,poi,neighborhood,place,locality`
        );
        const json = await res.json();
        if (json.features && json.features.length > 0) {
          setSuggestions(json.features.map((f: any) => ({ place_name: f.place_name, text: f.text })));
          updateDropdownPos();
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {}
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            updateDropdownPos();
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        data-testid={dataTestId}
      />
      {showSuggestions && suggestions.length > 0 && dropdownPos && ReactDOM.createPortal(
        <div
          id={uniqueId}
          className="bg-white dark:bg-gray-900 border border-border dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto"
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}
          data-testid="address-suggestions"
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors border-b border-border/20 last:border-0"
              onClick={() => {
                setInputValue(s.place_name);
                onChange(s.place_name);
                setShowSuggestions(false);
                setSuggestions([]);
              }}
              data-testid={`suggestion-${i}`}
            >
              <p className="text-sm font-semibold text-foreground dark:text-white truncate">{s.text}</p>
              <p className="text-[10px] text-muted-foreground dark:text-gray-400 truncate">{s.place_name}</p>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

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
  el.style.transition = "transform 0.4s ease";
  const img = document.createElement("img");
  img.src = src;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.transition = "opacity 0.3s ease";
  el.appendChild(img);
  return el;
}

function createDriverNavMarker(): HTMLElement {
  const outer = document.createElement("div");
  outer.style.width = "52px";
  outer.style.height = "52px";
  outer.style.position = "relative";
  outer.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.35))";

  const pulse = document.createElement("div");
  pulse.style.position = "absolute";
  pulse.style.inset = "-4px";
  pulse.style.borderRadius = "50%";
  pulse.style.border = "2px solid rgba(59,130,246,0.35)";
  pulse.style.animation = "driver-pulse 2.5s ease-in-out infinite";
  outer.appendChild(pulse);

  const img = document.createElement("img");
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.position = "relative";
  outer.appendChild(img);

  return outer;
}

function getMarkerIcon(mode: HopMode, hasMatchedRide: boolean, rideStatus?: string): string {
  if (rideStatus === "in_ride") return driverWithHopperUrl;
  if (mode === "drive") return driverAloneUrl;
  if (hasMatchedRide && mode === "hop") return hopperAloneUrl;
  return mode === "drive" ? driverAloneUrl : hopperAloneUrl;
}

type DriverNavRoute = {
  geometry: GeoJSON.LineString;
  pickupMarker?: { lat: number; lng: number; label: string };
  dropoffMarker?: { lat: number; lng: number; label: string };
  destMarkerCoord?: { lat: number; lng: number };
};

const NAV_ZOOM_DEFAULT = 17;
const NAV_ZOOM_MIN = 16;
const NAV_ZOOM_MAX = 18;
const NAV_PITCH = 50;
const RECENTER_DELAY_MS = 6000;
const FORWARD_OFFSET: [number, number] = [0, 100];

function lerpAngle(from: number, to: number, t: number): number {
  let diff = ((to - from + 540) % 360) - 180;
  return from + diff * t;
}

function findClosestPointIndex(coords: [number, number][], pos: [number, number]): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const dx = coords[i][0] - pos[0];
    const dy = coords[i][1] - pos[1];
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

function MapView({ mode, latitude, longitude, hasMatchedRide, rideStatus, walkingRoute, driverNavRoute, isDark }: { mode: HopMode; latitude: number | null; longitude: number | null; hasMatchedRide: boolean; rideStatus?: string; walkingRoute: GeoJSON.LineString | null; driverNavRoute: DriverNavRoute | null; isDark: boolean }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapError, setMapError] = useState(false);
  const mapErrorRef = useRef(false);
  const prevLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevTimeRef = useRef<number>(Date.now());
  const bearingRef = useRef(0);
  const smoothBearingRef = useRef(0);
  const speedRef = useRef(0);
  const isNavModeRef = useRef(false);
  const navTransitionDoneRef = useRef(false);
  const userDraggedRef = useRef(false);
  const recenterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showRecenter, setShowRecenter] = useState(false);

  const isNavMode = !!(mode === "drive" && driverNavRoute);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || mapErrorRef.current) return;

    const center: [number, number] = latitude && longitude ? [longitude, latitude] : LEX_CENTER;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: isNavMode
          ? "mapbox://styles/mapbox/navigation-night-v1"
          : (isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"),
        center,
        zoom: 15,
        attributionControl: false,
        pitch: 0,
        bearing: 0,
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

    map.on("dragstart", () => {
      if (isNavModeRef.current) {
        userDraggedRef.current = true;
        setShowRecenter(true);
        if (recenterTimerRef.current) clearTimeout(recenterTimerRef.current);
        recenterTimerRef.current = setTimeout(() => {
          if (!mapRef.current || !isNavModeRef.current) return;
          userDraggedRef.current = false;
          setShowRecenter(false);
          const lat = prevLatLngRef.current?.lat;
          const lng = prevLatLngRef.current?.lng;
          if (lat && lng) {
            mapRef.current.flyTo({
              center: [lng, lat],
              zoom: getSpeedZoom(speedRef.current),
              pitch: NAV_PITCH,
              bearing: smoothBearingRef.current,
              duration: 1000,
              offset: FORWARD_OFFSET,
            });
          }
        }, RECENTER_DELAY_MS);
      }
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    mapRef.current = map;

    return () => {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
      if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null; }
      if (dropoffMarkerRef.current) { dropoffMarkerRef.current.remove(); dropoffMarkerRef.current = null; }
      if (recenterTimerRef.current) clearTimeout(recenterTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function getSpeedZoom(mph: number): number {
    if (mph < 5) return NAV_ZOOM_MAX;
    if (mph > 40) return NAV_ZOOM_MIN;
    return NAV_ZOOM_MAX - ((mph - 5) / 35) * (NAV_ZOOM_MAX - NAV_ZOOM_MIN);
  }

  useEffect(() => {
    isNavModeRef.current = isNavMode;
  }, [isNavMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    const newStyle = isNavMode
      ? "mapbox://styles/mapbox/navigation-night-v1"
      : (isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12");
    mapRef.current.setStyle(newStyle);

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (!isNavMode) {
      navTransitionDoneRef.current = false;
      userDraggedRef.current = false;
      setShowRecenter(false);
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [isDark, isNavMode]);

  useEffect(() => {
    if (isNavMode && !navTransitionDoneRef.current && latitude && longitude && mapRef.current) {
      navTransitionDoneRef.current = true;
      const map = mapRef.current;
      map.flyTo({
        center: [longitude, latitude],
        zoom: NAV_ZOOM_DEFAULT,
        pitch: NAV_PITCH,
        bearing: smoothBearingRef.current,
        duration: 1200,
        essential: true,
        offset: FORWARD_OFFSET,
      });
    }
  }, [isNavMode, latitude, longitude]);

  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;

    const lngLat: [number, number] = [longitude, latitude];
    const iconSrc = getMarkerIcon(mode, hasMatchedRide, rideStatus);
    const now = Date.now();
    const prevPos = prevLatLngRef.current;

    if (prevPos && isNavMode) {
      const dLat = latitude - prevPos.lat;
      const dLng = longitude - prevPos.lng;
      const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
      const dtSec = Math.max((now - prevTimeRef.current) / 1000, 0.1);

      if (distDeg > 0.00003) {
        const rawBearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        bearingRef.current = rawBearing;
        smoothBearingRef.current = lerpAngle(smoothBearingRef.current, rawBearing, 0.3);

        const distMiles = distDeg * 69;
        const mph = (distMiles / dtSec) * 3600;
        speedRef.current = speedRef.current * 0.7 + mph * 0.3;
      }
    }

    const movedEnough = !prevPos || Math.abs(latitude - prevPos.lat) > 0.0001 || Math.abs(longitude - prevPos.lng) > 0.0001;
    prevLatLngRef.current = { lat: latitude, lng: longitude };
    prevTimeRef.current = now;

    const swapMarkerIcon = (img: HTMLImageElement, newSrc: string) => {
      if (img.src !== newSrc && img.getAttribute("data-src") !== newSrc) {
        img.setAttribute("data-src", newSrc);
        const el = img.parentElement;
        if (el) {
          el.style.transform = "scale(0.85)";
          img.style.opacity = "0.3";
        }
        setTimeout(() => {
          img.src = newSrc;
          if (el) {
            el.style.transform = "scale(1.1)";
            img.style.opacity = "1";
          }
          setTimeout(() => {
            if (el) el.style.transform = "scale(1)";
          }, 200);
        }, 150);
      }
    };

    if (isNavMode) {
      if (markerRef.current) {
        markerRef.current.setLngLat(lngLat);
        const img = markerRef.current.getElement().querySelector("img");
        if (img) swapMarkerIcon(img as HTMLImageElement, iconSrc);
      } else {
        const el = createDriverNavMarker();
        const img = el.querySelector("img");
        if (img) img.src = iconSrc;
        markerRef.current = new mapboxgl.Marker({ element: el, rotationAlignment: "viewport", pitchAlignment: "viewport" })
          .setLngLat(lngLat)
          .addTo(mapRef.current);
      }

      if (!userDraggedRef.current && navTransitionDoneRef.current) {
        const targetZoom = getSpeedZoom(speedRef.current);
        mapRef.current.easeTo({
          center: lngLat,
          bearing: smoothBearingRef.current,
          zoom: targetZoom,
          pitch: NAV_PITCH,
          duration: 1200,
          offset: FORWARD_OFFSET,
          easing: (t) => t * (2 - t),
        });
      }
    } else {
      if (markerRef.current) {
        if (movedEnough) {
          markerRef.current.setLngLat(lngLat);
        }
        const img = markerRef.current.getElement().querySelector("img");
        if (img) swapMarkerIcon(img as HTMLImageElement, iconSrc);
      } else {
        const el = createMarkerEl(iconSrc);
        markerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(mapRef.current);
      }

      if (!walkingRoute && !driverNavRoute && movedEnough) {
        mapRef.current.easeTo({ center: lngLat, duration: 1200, easing: (t) => t * (2 - t) });
      }
    }
  }, [latitude, longitude, mode, hasMatchedRide, rideStatus, isNavMode]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function addOrUpdateDriverRoute() {
      if (!map!.isStyleLoaded()) return;

      if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null; }
      if (dropoffMarkerRef.current) { dropoffMarkerRef.current.remove(); dropoffMarkerRef.current = null; }

      const driverPos: [number, number] | null = (latitude && longitude) ? [longitude, latitude] : null;

      if (driverNavRoute && driverNavRoute.geometry.coordinates.length > 1 && driverPos) {
        const allCoords = driverNavRoute.geometry.coordinates as [number, number][];
        const splitIdx = findClosestPointIndex(allCoords, driverPos);

        const completedCoords = allCoords.slice(0, splitIdx + 1);
        const remainingCoords = allCoords.slice(splitIdx);

        if (map!.getSource("driver-nav-completed")) {
          (map!.getSource("driver-nav-completed") as mapboxgl.GeoJSONSource).setData({
            type: "LineString", coordinates: completedCoords.length > 1 ? completedCoords : []
          });
        } else {
          map!.addSource("driver-nav-completed", {
            type: "geojson",
            data: { type: "LineString", coordinates: completedCoords.length > 1 ? completedCoords : [] }
          });
          map!.addLayer({
            id: "driver-nav-completed-line",
            type: "line",
            source: "driver-nav-completed",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.25 },
          });
        }

        if (map!.getSource("driver-nav-route")) {
          (map!.getSource("driver-nav-route") as mapboxgl.GeoJSONSource).setData({
            type: "LineString", coordinates: remainingCoords.length > 1 ? remainingCoords : allCoords
          });
        } else {
          map!.addSource("driver-nav-route", {
            type: "geojson",
            data: { type: "LineString", coordinates: remainingCoords.length > 1 ? remainingCoords : allCoords }
          });
          map!.addLayer({
            id: "driver-nav-route-line",
            type: "line",
            source: "driver-nav-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.9 },
          });
        }
      } else if (driverNavRoute) {
        const emptyLine: GeoJSON.LineString = { type: "LineString", coordinates: [] };
        if (map!.getSource("driver-nav-completed")) {
          (map!.getSource("driver-nav-completed") as mapboxgl.GeoJSONSource).setData(emptyLine);
        }
        if (map!.getSource("driver-nav-route")) {
          (map!.getSource("driver-nav-route") as mapboxgl.GeoJSONSource).setData(driverNavRoute.geometry);
        } else {
          map!.addSource("driver-nav-route", { type: "geojson", data: driverNavRoute.geometry });
          map!.addLayer({
            id: "driver-nav-route-line",
            type: "line",
            source: "driver-nav-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.9 },
          });
        }
      } else {
        const emptyLine: GeoJSON.LineString = { type: "LineString", coordinates: [] };
        if (map!.getSource("driver-nav-route")) {
          (map!.getSource("driver-nav-route") as mapboxgl.GeoJSONSource).setData(emptyLine);
        }
        if (map!.getSource("driver-nav-completed")) {
          (map!.getSource("driver-nav-completed") as mapboxgl.GeoJSONSource).setData(emptyLine);
        }
      }

      if (driverNavRoute) {
        if (driverNavRoute.pickupMarker) {
          const pEl = createMarkerEl(hopperAloneUrl);
          pEl.style.width = "44px";
          pEl.style.height = "44px";
          pickupMarkerRef.current = new mapboxgl.Marker({ element: pEl })
            .setLngLat([driverNavRoute.pickupMarker.lng, driverNavRoute.pickupMarker.lat])
            .addTo(map!);
        }
        if (driverNavRoute.dropoffMarker) {
          const dEl = document.createElement("div");
          dEl.innerHTML = `<div style="width:28px;height:28px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="color:white;font-size:13px">📍</span></div>`;
          dropoffMarkerRef.current = new mapboxgl.Marker({ element: dEl })
            .setLngLat([driverNavRoute.dropoffMarker.lng, driverNavRoute.dropoffMarker.lat])
            .addTo(map!);
        }

        if (driverNavRoute.destMarkerCoord) {
          if (destMarkerRef.current) {
            destMarkerRef.current.setLngLat([driverNavRoute.destMarkerCoord.lng, driverNavRoute.destMarkerCoord.lat]);
          } else {
            const el = document.createElement("div");
            el.innerHTML = `<div style="width:28px;height:28px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="color:white;font-size:13px">🏁</span></div>`;
            destMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([driverNavRoute.destMarkerCoord.lng, driverNavRoute.destMarkerCoord.lat])
              .addTo(map!);
          }
        }

      } else {
        if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
      }
    }

    if (map.isStyleLoaded()) {
      addOrUpdateDriverRoute();
    } else {
      map.once("style.load", addOrUpdateDriverRoute);
    }
  }, [driverNavRoute, latitude, longitude]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !latitude || !longitude) return;
    userDraggedRef.current = false;
    setShowRecenter(false);
    if (recenterTimerRef.current) clearTimeout(recenterTimerRef.current);
    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: getSpeedZoom(speedRef.current),
      pitch: NAV_PITCH,
      bearing: smoothBearingRef.current,
      duration: 800,
      offset: FORWARD_OFFSET,
    });
  }, [latitude, longitude]);

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
      <AnimatePresence>
        {showRecenter && isNavMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.25 }}
            onClick={handleRecenter}
            className="absolute top-4 right-4 z-30 w-12 h-12 rounded-full bg-white/90 dark:bg-black/80 shadow-xl border border-border/30 flex items-center justify-center backdrop-blur-sm"
            data-testid="button-recenter-map"
            title="Recenter on driver"
          >
            <Navigation className="w-5 h-5 text-blue-500" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlowingSearchText() {
  const words = ["Looking", "for", "hoppers", "nearby"];
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < words.length) {
      const timer = setTimeout(() => setVisibleCount(prev => prev + 1), 400);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setVisibleCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [visibleCount]);

  return (
    <span className="inline-flex gap-1 items-center" data-testid="text-searching-hoppers">
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: i < visibleCount ? 1 : 0, y: i < visibleCount ? 0 : 4 }}
          transition={{ duration: 0.3 }}
          className="text-orange-500 dark:text-orange-400 font-bold text-[11px]"
          style={{ textShadow: "0 0 8px rgba(249,115,22,0.5)" }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

function SeatIcon({ className }: { className?: string }) {
  return <img src="/seat-icon.png" alt="" className={className || "w-4 h-4"} style={{ objectFit: "contain" }} draggable={false} />;
}

function HopperIcon({ className, searching }: { className?: string; searching?: boolean }) {
  return (
    <img
      src="/hopper-icon.png"
      alt=""
      className={`${className || "w-5 h-5"} ${searching ? "animate-pulse opacity-60" : ""}`}
      style={{ objectFit: "contain" }}
      draggable={false}
    />
  );
}

function DriverNavBar({ user, hop, routeInfo, onStop, onStartRide, onCompleteRide }: {
  user: User;
  hop: any | null;
  routeInfo: { distance: string; eta: string } | null;
  onStop: () => void;
  onStartRide: (hopId: number) => void;
  onCompleteRide: (hopId: number) => void;
}) {
  const totalSeats = (user as any)?.availableSeats || 1;
  const { data: hops } = useHops();
  const activeHops = hops?.filter(h => (h.status === "matched" || h.status === "in_ride") && h.driverId === user.id) || [];
  const occupiedSeats = activeHops.reduce((sum: number, h: any) => sum + (h.seatsNeeded || 1), 0);
  const isFull = occupiedSeats >= totalSeats;

  const hopperUser = hop ? (hop as any).walker : null;
  const hopperVibe = hopperUser?.rideVibe || "friendly_chat";
  const rideStyleEmoji = hopperVibe === "quiet_ride" ? "🤫" : hopperVibe === "social" ? "🤝" : "😊";

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3"
      data-testid="driver-nav-bar"
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
    >
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/30 px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {routeInfo && (
              <>
                <div className="text-center" data-testid="display-nav-eta">
                  <p className="text-white font-black text-base leading-none">{routeInfo.eta}</p>
                  <p className="text-white/50 text-[8px] font-semibold mt-0.5">ETA</p>
                </div>
                <div className="w-px h-6 bg-white/20" />
                <div className="text-center" data-testid="display-nav-distance">
                  <p className="text-white font-black text-base leading-none">{routeInfo.distance}</p>
                  <p className="text-white/50 text-[8px] font-semibold mt-0.5">DIST</p>
                </div>
                <div className="w-px h-6 bg-white/20" />
              </>
            )}
            <div className="flex items-center gap-1.5" data-testid="display-nav-seats">
              <SeatIcon className="w-7 h-7" />
              <span className="text-white font-black text-base leading-none">{occupiedSeats}/{totalSeats}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HopperIcon className="w-5 h-5" searching={!hop && !isFull} />
            <button
              onClick={onStop}
              className="w-8 h-8 rounded-full bg-red-500/30 border border-red-400/50 flex items-center justify-center hover:bg-red-500/50 transition-colors"
              data-testid="button-driver-stop-bar"
              title="Go offline"
            >
              <Power className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {isFull && (
          <div className="bg-white/10 rounded-xl px-3 py-2" data-testid="display-seats-full">
            <p className="text-white/90 font-black text-sm text-center">Route locked — All seats full</p>
          </div>
        )}

        {!hop && !isFull && (
          <div className="flex items-center justify-center gap-2 py-1">
            <GlowingSearchText />
          </div>
        )}

        {hop && hop.status === "matched" && (
          <div className="bg-white/10 rounded-xl px-3 py-2.5" data-testid="display-matched-hopper">
            <div className="flex items-center gap-3">
              {hopperUser?.profilePhoto ? (
                <img src={hopperUser.profilePhoto} className="w-10 h-10 rounded-full border-2 border-white/60 object-cover shrink-0" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center shrink-0">
                  <HopperIcon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-bold truncate">
                  {hopperUser?.username || hop.walkerName || "Hopper"} {rideStyleEmoji}
                </p>
                <p className="text-white/50 text-[10px]">heading to pickup</p>
              </div>
              <button
                onClick={() => onStartRide(hop.id)}
                className="px-4 py-2.5 bg-white text-orange-600 text-xs font-black rounded-xl shrink-0 shadow-lg hover:bg-white/90 transition-colors"
                data-testid="button-driver-start-ride-bar"
              >
                Pick Up
              </button>
            </div>
          </div>
        )}

        {hop && hop.status === "in_ride" && (
          <div className="space-y-2">
            <div className="bg-white/10 rounded-xl px-3 py-2.5" data-testid="display-in-ride-hopper">
              <div className="flex items-center gap-3">
                {hopperUser?.profilePhoto ? (
                  <img src={hopperUser.profilePhoto} className="w-10 h-10 rounded-full border-2 border-green-300/60 object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/15 border-2 border-green-300/40 flex items-center justify-center shrink-0">
                    <HopperIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-bold truncate">
                    {hopperUser?.username || hop.walkerName || "Hopper"} {rideStyleEmoji}
                  </p>
                  <p className="text-green-200 text-[10px] font-semibold">in ride</p>
                </div>
                <button
                  onClick={() => onCompleteRide(hop.id)}
                  className="px-4 py-2.5 bg-green-400 text-green-900 text-xs font-black rounded-xl shrink-0 shadow-lg hover:bg-green-300 transition-colors"
                  data-testid="button-driver-complete-ride-bar"
                >
                  Complete
                </button>
              </div>
            </div>
            <SpontaneousStopDriver hopId={hop.id} />
          </div>
        )}

        {hop && hopperUser && (
          <p className="text-[9px] text-white/40 italic text-center" data-testid="display-ride-preference-advisory">
            {rideStyleEmoji} {hopperVibe === "quiet_ride" ? "prefers quiet" : hopperVibe === "social" ? "loves chatting" : "friendly vibes"} · please be kind & respect all preferences
          </p>
        )}
      </div>
    </motion.div>
  );
}

function GlowingCarousel({ user }: { user: User }) {
  const items = [
    { emoji: "🔥", value: user.hopStreak || 0, label: "streak" },
    { emoji: "⭐", value: user.totalHops || 0, label: "hops" },
    { emoji: "🛞", value: (user.credits || 0).toFixed(2), label: "wheels" },
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

function PendingHopperPrompt() {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);
  const { data: pending = [] } = useQuery<any[]>({
    queryKey: ['/api/driver/pending-hoppers'],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (pending.length > prevCountRef.current) {
      try {
        if ("vibrate" in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch {}
    }
    prevCountRef.current = pending.length;
  }, [pending.length]);

  const acceptMut = useMutation({
    mutationFn: async (hopId: number) => {
      await apiRequest("POST", `/api/driver/pending-hoppers/${hopId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/pending-hoppers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
      showFlash("✅", "Hopper accepted!", "success");
    },
    onError: () => showFlash("⚠️", "Could not accept", "error"),
  });

  const declineMut = useMutation({
    mutationFn: async (hopId: number) => {
      await apiRequest("POST", `/api/driver/pending-hoppers/${hopId}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/pending-hoppers'] });
      showFlash("👋", "Hopper declined", "info");
    },
  });

  if (!pending.length) return null;

  return (
    <div className="space-y-1.5">
      {pending.map((p: any) => (
        <motion.div
          key={p.hopId}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-purple-300/50 dark:border-purple-700/40 bg-purple-50/60 dark:bg-purple-950/20 p-2.5"
          data-testid={`pending-hopper-${p.hopId}`}
        >
          <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
            <span>🚏</span> New hopper going to {p.hopperDest}
          </p>
          <p className="text-[9px] text-purple-600/70 dark:text-purple-400/60 mb-1.5">Fits your current route</p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="flex-1 h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              onClick={() => acceptMut.mutate(p.hopId)}
              disabled={acceptMut.isPending}
              data-testid={`button-accept-hopper-${p.hopId}`}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-[10px] rounded-lg font-bold"
              onClick={() => declineMut.mutate(p.hopId)}
              disabled={declineMut.isPending}
              data-testid={`button-decline-hopper-${p.hopId}`}
            >
              Decline
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const SAFETY_MESSAGES = [
  "Click click — seatbelt check?",
  "Stay aware, stay safe 🤝",
  "Respect each other's ride preferences",
  "Keep it kind, keep it smooth",
  "Got everything with you?",
  "Short Hop's got your back",
  "Safe rides = better vibes",
  "Eyes up, phone down when stepping out",
];

function SafetyMessageRotator() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const delay = 5000 + Math.random() * 3000;
    const timer = setTimeout(() => {
      setIdx(prev => (prev + 1) % SAFETY_MESSAGES.length);
    }, delay);
    return () => clearTimeout(timer);
  }, [idx]);

  return (
    <div className="bg-green-50/50 dark:bg-green-950/10 border border-green-200/30 dark:border-green-800/20 rounded-lg px-2.5 py-1.5" data-testid="safety-message-rotator">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-[10px] text-green-700 dark:text-green-400 font-medium flex items-center gap-1.5"
        >
          <Shield className="w-3 h-3 shrink-0" />
          {SAFETY_MESSAGES[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function getCommonTraits(user: any, driverInfo: any): string[] {
  const common: string[] = [];
  if (!driverInfo) return common;

  if (user.rideVibe && driverInfo.rideVibe && user.rideVibe === driverInfo.rideVibe) {
    const vibeLabels: Record<string, string> = { friendly_chat: "Friendly Chat", quiet_ride: "Quiet Ride", music_vibes: "Music Vibes" };
    common.push(`Both prefer: ${vibeLabels[user.rideVibe] || user.rideVibe}`);
  }

  if (user.interests && driverInfo.interests) {
    const myInterests = user.interests.toLowerCase().split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean);
    const theirInterests = driverInfo.interests.toLowerCase().split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean);
    const shared = myInterests.filter((i: string) => theirInterests.some((t: string) => t.includes(i) || i.includes(t)));
    shared.slice(0, 2).forEach((s: string) => common.push(`Shared interest: ${s}`));
  }

  if (user.driverMusicPref && driverInfo.driverMusicPref && user.driverMusicPref === driverInfo.driverMusicPref) {
    common.push(`Same music taste: ${driverInfo.driverMusicPref}`);
  }

  if (user.favoritePlaces && driverInfo.favoritePlaces) {
    const myPlaces = user.favoritePlaces.toLowerCase().split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean);
    const theirPlaces = driverInfo.favoritePlaces.toLowerCase().split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean);
    const sharedPlaces = myPlaces.filter((p: string) => theirPlaces.some((t: string) => t.includes(p) || p.includes(t)));
    if (sharedPlaces.length > 0) common.push(`Both like: ${sharedPlaces[0]}`);
  }

  if (user.city && driverInfo.city && user.city.toLowerCase() === driverInfo.city.toLowerCase()) {
    common.push(`Same city: ${driverInfo.city}`);
  }

  return common.slice(0, 3);
}

function colorClassToHex(colorClass: string): string {
  const map: Record<string, string> = {
    "text-orange-500": "#f97316",
    "text-violet-500": "#8b5cf6",
    "text-cyan-500": "#06b6d4",
    "text-rose-500": "#f43f5e",
    "text-lime-500": "#84cc16",
    "text-amber-500": "#fbbf24",
    "text-sky-500": "#0ea5e9",
    "text-fuchsia-500": "#d946ef",
    "text-orange-400": "#fb923c",
    "text-violet-400": "#a78bfa",
    "text-cyan-400": "#22d3ee",
    "text-rose-400": "#fb7185",
    "text-lime-400": "#a3e635",
    "text-amber-400": "#fbbf24",
    "text-sky-400": "#38bdf8",
    "text-fuchsia-400": "#e879f9",
  };
  return map[colorClass] || "#22c55e";
}

function HopperRidePanel({ activeHop, user, tracking, pickupTimerRemaining, queryClient }: {
  activeHop: any;
  user: any;
  tracking: any;
  pickupTimerRemaining: number | null;
  queryClient: any;
}) {
  const { data: driverInfo } = useQuery({
    queryKey: ['/api/hops', activeHop.id, 'driver-info'],
    queryFn: async () => {
      const res = await fetch(`/api/hops/${activeHop.id}/driver-info`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
    enabled: !!(activeHop?.id),
  });

  const commonTraits = getCommonTraits(user, driverInfo);
  const isInRide = activeHop.status === "in_ride";
  const isMatched = activeHop.status === "matched";

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-30"
      data-testid="card-active-ride"
      initial={{ y: 400, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 260, delay: 0.05 }}
    >
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-t-[2rem] shadow-2xl shadow-blue-900/40 px-5 pt-5 pb-6 min-h-[52vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isMatched ? (
              <div className="bg-white/15 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-bold">Driver on the way</span>
              </div>
            ) : (
              <div className="bg-green-400/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-green-300" />
                <span className="text-green-200 text-xs font-bold">In Ride</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tracking.available && tracking.distance !== null && (
              <div className="bg-white/15 rounded-full px-2.5 py-1" data-testid="text-tracking-distance">
                <span className="text-white text-[11px] font-bold">
                  {tracking.distance < 0.1 ? "< 0.1 mi" : `${tracking.distance.toFixed(1)} mi`}
                </span>
              </div>
            )}
            {tracking.etaMinutes && isMatched && (
              <div className="bg-white/20 rounded-full px-2.5 py-1" data-testid="display-pickup-eta">
                <span className="text-white text-[11px] font-bold">~{tracking.etaMinutes} min</span>
              </div>
            )}
          </div>
        </div>

        {driverInfo && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-3" data-testid="driver-profile-section">
            <div className="flex items-center gap-3.5">
              {driverInfo.profilePhoto ? (
                <img
                  src={driverInfo.profilePhoto}
                  className="w-14 h-14 rounded-2xl object-cover shrink-0 border-2 border-white/40 shadow-lg"
                  alt=""
                  data-testid="img-driver-photo"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center shrink-0">
                  <Car className="w-6 h-6 text-white/70" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-white truncate flex items-center gap-1.5" data-testid="text-driver-name">
                  {driverInfo.username}
                  {driverInfo.idVerified && <Shield className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
                </p>
                <p className="text-[11px] text-white/60 truncate mt-0.5" data-testid="text-driver-vehicle">
                  {[driverInfo.vehicleColor, driverInfo.vehicleMake, driverInfo.vehicleModel].filter(Boolean).join(" ")}
                  {driverInfo.licensePlate && ` · ${driverInfo.licensePlate}`}
                </p>
                {driverInfo.totalHops !== undefined && driverInfo.totalHops > 0 && (
                  <p className="text-[10px] text-white/40 mt-0.5">{driverInfo.totalHops} hops completed</p>
                )}
              </div>
            </div>
            <p className="text-[9px] text-white/35 italic mt-2.5 text-center" data-testid="display-driver-preference-advisory">
              {driverInfo.driverConvoComfort === "quiet_ride" ? "🤫 prefers quiet" : driverInfo.driverConvoComfort === "social" ? "🤝 loves chatting" : "😊 friendly vibes"} · please be kind & respect all preferences
            </p>
          </div>
        )}

        <div className="flex-1 space-y-2.5 overflow-y-auto">
          {pickupTimerRemaining !== null && isMatched && (
            <div className={`flex items-center gap-2.5 rounded-xl p-3 ${pickupTimerRemaining <= 30 ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/10 border border-white/10'}`} data-testid="display-pickup-timer">
              <Timer className={`w-4 h-4 shrink-0 ${pickupTimerRemaining <= 30 ? 'text-red-300' : 'text-white/70'}`} />
              <p className={`text-xs font-bold ${pickupTimerRemaining <= 30 ? 'text-red-200' : 'text-white/80'}`}>
                Pickup window: {Math.floor(pickupTimerRemaining / 60)}:{String(pickupTimerRemaining % 60).padStart(2, '0')}
                {pickupTimerRemaining <= 0 && " — Time expired"}
              </p>
            </div>
          )}

          {tracking.pickupSide && isMatched && (
            <div className="flex items-center gap-2.5 bg-white/10 rounded-xl p-3 border border-white/10" data-testid="display-pickup-side">
              <MapPin className="w-4 h-4 text-blue-200 shrink-0" />
              <p className="text-xs font-semibold text-white/90">{tracking.pickupSide}</p>
            </div>
          )}

          {tracking.available && tracking.direction && isMatched && (
            <p className="text-[11px] text-white/50 px-1">
              Driver heading {tracking.direction} toward you
            </p>
          )}

          {commonTraits.length > 0 && (
            <div className="bg-white/10 rounded-xl px-3.5 py-2.5 border border-white/10" data-testid="common-traits">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-1">In Common</p>
              <div className="flex flex-wrap gap-1.5">
                {commonTraits.map((trait, i) => (
                  <span key={i} className="text-[10px] text-white/80 bg-white/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 shrink-0 text-yellow-300" /> {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isMatched && (
            <button
              className="w-full py-3.5 bg-white text-blue-600 text-sm font-black rounded-2xl shadow-lg hover:bg-white/90 transition-colors"
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
              Confirm Pickup — Start Ride
            </button>
          )}

          {isInRide && <SafetyMessageRotator />}

          {isInRide && (
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-[10px] text-white/70" data-testid="gps-ride-info">
              <p className="font-medium flex items-center gap-1.5"><span>📡</span> GPS is tracking this ride for your protection</p>
              <p className="mt-0.5 text-white/40">Keep location services enabled for refund eligibility.</p>
            </div>
          )}

          {isInRide && (
            <SpontaneousStopHopper hopId={activeHop.id} />
          )}

          {(isMatched || isInRide) && (
            <RideChat hopId={activeHop.id} currentUserId={user.id} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SpontaneousStopHopper({ hopId }: { hopId: number }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const queryClient = useQueryClient();

  const { data: ssData, refetch: refetchSs } = useQuery({
    queryKey: ['/api/hops', hopId, 'ss-status'],
    queryFn: async () => {
      const res = await fetch(`/api/hops/${hopId}/ss-status`, { credentials: 'include' });
      if (!res.ok) return { active: false };
      return res.json();
    },
    refetchInterval: 3000,
  });

  const stop = ssData?.stop;
  const isActive = ssData?.active && stop;

  const [localElapsed, setLocalElapsed] = useState(0);
  useEffect(() => {
    if (!stop?.driverArrivedAt || stop.status !== "active") { setLocalElapsed(0); return; }
    const arrivalTime = new Date(stop.driverArrivedAt).getTime();
    const tick = () => setLocalElapsed(Math.floor((Date.now() - arrivalTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [stop?.driverArrivedAt, stop?.status]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const res = await fetch(`/api/hops/${hopId}/ss-request`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        showFlash("🛑", "SS request sent to driver!", "success");
        refetchSs();
      } else {
        const data = await res.json().catch(() => ({}));
        showFlash("⚠️", data.message || "Couldn't request SS", "error");
      }
    } catch { showFlash("⚠️", "Failed to request SS", "error"); }
    setRequesting(false);
    setShowConfirm(false);
  };

  const handleComplete = async () => {
    try {
      const res = await fetch(`/api/hops/${hopId}/ss-complete`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        showFlash("✅", "Spontaneous Stop completed!", "success");
        refetchSs();
        queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
      }
    } catch { showFlash("⚠️", "Failed to complete SS", "error"); }
  };

  if (isActive && stop.status === "requested") {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-700/30 rounded-lg p-2.5" data-testid="ss-waiting-approval">
        <p className="text-[11px] font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for driver to approve your stop...
        </p>
        <p className="text-[10px] text-yellow-700/70 dark:text-yellow-400/60 mt-0.5">$2.00 fee will be added if approved</p>
      </div>
    );
  }

  if (isActive && stop.status === "approved") {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-700/30 rounded-lg p-2.5" data-testid="ss-approved">
        <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Driver approved your stop!
        </p>
        <p className="text-[10px] text-blue-700/70 dark:text-blue-400/60 mt-0.5">Waiting for driver to arrive at the stop location</p>
      </div>
    );
  }

  if (isActive && stop.status === "active") {
    const mins = Math.floor(localElapsed / 60);
    const secs = localElapsed % 60;
    const overTime = localElapsed > 180;
    const extraMins = overTime ? Math.ceil((localElapsed - 180) / 60) : 0;
    const extraFee = extraMins * 0.50;
    const totalFee = 2.00 + extraFee;
    const timeLeft = Math.max(0, 180 - localElapsed);

    return (
      <div className={`border rounded-lg p-2.5 ${overTime ? 'bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-700/30' : 'bg-green-50 dark:bg-green-950/20 border-green-200/50 dark:border-green-700/30'}`} data-testid="ss-active-hopper">
        <p className={`text-[11px] font-bold flex items-center gap-1.5 ${overTime ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'}`}>
          <Timer className="w-3.5 h-3.5" />
          {overTime ? "⚠️ Over time!" : "Spontaneous Stop Active"}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] font-mono font-bold text-foreground dark:text-white">
            {overTime ? `+${mins - 3}:${String(secs).padStart(2, '0')} over` : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} left`}
          </span>
          <span className="text-[10px] font-bold text-foreground dark:text-white">${totalFee.toFixed(2)}</span>
        </div>
        {overTime && (
          <p className="text-[9px] text-red-600 dark:text-red-400 mt-0.5">$0.50/min being added. Please hurry back!</p>
        )}
        <Button size="sm" className="w-full mt-2 text-[10px] h-7 bg-green-600 hover:bg-green-700 text-white" onClick={handleComplete} data-testid="button-ss-done">
          I'm Done — Back to Car
        </Button>
      </div>
    );
  }

  if (isActive && stop.status === "denied") {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-700/30 rounded-lg p-2 text-[10px] text-red-700 dark:text-red-300" data-testid="ss-denied">
        <p className="font-medium">Driver declined the spontaneous stop request</p>
      </div>
    );
  }

  return (
    <div data-testid="ss-button-container">
      {showConfirm ? (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-700/30 rounded-lg p-2.5 space-y-2" data-testid="ss-confirm-dialog">
          <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300">Want to make a Spontaneous Stop?</p>
          <div className="text-[10px] text-purple-700/80 dark:text-purple-400/70 space-y-0.5">
            <p>• Must be along the current route</p>
            <p>• Quick stop — under 3 minutes</p>
            <p>• $2.00 fee added to your ride</p>
            <p>• $0.50/min after 3 minutes</p>
            <p>• Driver must approve</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-[10px] h-7 bg-purple-600 hover:bg-purple-700 text-white" onClick={handleRequest} disabled={requesting} data-testid="button-ss-confirm">
              {requesting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes, Request SS"}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7" onClick={() => setShowConfirm(false)} data-testid="button-ss-cancel">
              Never mind
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-[10px] h-8 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
          onClick={() => setShowConfirm(true)}
          data-testid="button-ss-open"
        >
          <Square className="w-3 h-3 mr-1" /> SS — Spontaneous Stop
        </Button>
      )}
    </div>
  );
}

function SpontaneousStopDriver({ hopId }: { hopId: number }) {
  const queryClient = useQueryClient();

  const { data: ssData, refetch: refetchSs } = useQuery({
    queryKey: ['/api/hops', hopId, 'ss-status'],
    queryFn: async () => {
      const res = await fetch(`/api/hops/${hopId}/ss-status`, { credentials: 'include' });
      if (!res.ok) return { active: false };
      return res.json();
    },
    refetchInterval: 3000,
  });

  const stop = ssData?.stop;
  const isActive = ssData?.active && stop;

  const [localElapsed, setLocalElapsed] = useState(0);
  useEffect(() => {
    if (!stop?.driverArrivedAt || stop.status !== "active") { setLocalElapsed(0); return; }
    const arrivalTime = new Date(stop.driverArrivedAt).getTime();
    const tick = () => setLocalElapsed(Math.floor((Date.now() - arrivalTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [stop?.driverArrivedAt, stop?.status]);

  const handleApprove = async () => {
    try {
      const res = await fetch(`/api/hops/${hopId}/ss-approve`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) { showFlash("✅", "Stop approved!", "success"); refetchSs(); }
    } catch { showFlash("⚠️", "Failed to approve", "error"); }
  };

  const handleDeny = async () => {
    try {
      const res = await fetch(`/api/hops/${hopId}/ss-deny`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) { showFlash("🚫", "Stop denied", "info"); refetchSs(); }
    } catch { showFlash("⚠️", "Failed to deny", "error"); }
  };

  const handleArrive = async () => {
    try {
      const res = await fetch(`/api/hops/${hopId}/ss-arrive`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) { showFlash("📍", "Arrived at stop — timer started!", "success"); refetchSs(); }
    } catch { showFlash("⚠️", "Failed to mark arrival", "error"); }
  };

  const handleComplete = async () => {
    try {
      const res = await fetch(`/api/hops/${hopId}/ss-complete`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        showFlash("✅", "Stop completed!", "success");
        refetchSs();
        queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
      }
    } catch { showFlash("⚠️", "Failed to complete", "error"); }
  };

  if (!isActive) return null;

  if (stop.status === "requested") {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-3 space-y-2" data-testid="ss-driver-request">
        <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200 flex items-center gap-1.5">
          🛑 Hopper wants a Spontaneous Stop
        </p>
        <p className="text-[10px] text-yellow-700/80 dark:text-yellow-400/70">
          Must be on the current route. Stop is under 3 min. You'll earn extra fare.
        </p>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} data-testid="button-ss-approve">
            <Check className="w-3.5 h-3.5 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8 border-red-300 text-red-600 hover:bg-red-50" onClick={handleDeny} data-testid="button-ss-deny">
            <X className="w-3.5 h-3.5 mr-1" /> Deny
          </Button>
        </div>
      </div>
    );
  }

  if (stop.status === "approved") {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700 rounded-xl p-3 space-y-2" data-testid="ss-driver-approved">
        <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5" /> Head to the stop location
        </p>
        <Button size="sm" className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleArrive} data-testid="button-ss-arrived">
          <MapPin className="w-3.5 h-3.5 mr-1" /> I've Arrived at Stop
        </Button>
      </div>
    );
  }

  if (stop.status === "active") {
    const mins = Math.floor(localElapsed / 60);
    const secs = localElapsed % 60;
    const overTime = localElapsed > 180;
    const extraMins = overTime ? Math.ceil((localElapsed - 180) / 60) : 0;
    const extraFee = extraMins * 0.50;
    const totalFee = 2.00 + extraFee;

    return (
      <div className={`border-2 rounded-xl p-3 space-y-2 ${overTime ? 'bg-red-50 dark:bg-red-950/20 border-red-400 dark:border-red-600' : 'bg-green-50 dark:bg-green-950/20 border-green-400 dark:border-green-600'}`} data-testid="ss-driver-active">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold flex items-center gap-1.5 ${overTime ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'}`}>
            <Timer className="w-4 h-4" /> SS Timer
          </p>
          <span className="text-lg font-mono font-black text-foreground dark:text-white" data-testid="text-ss-timer">
            {mins}:{String(secs).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-foreground/70 dark:text-gray-300">
            {overTime ? `$0.50/min extra since 3:00` : "Hopper has 3 min"}
          </span>
          <span className="text-xs font-bold text-foreground dark:text-white flex items-center gap-0.5">
            <DollarSign className="w-3 h-3" /> {totalFee.toFixed(2)} earned
          </span>
        </div>
        <p className="text-[10px] text-foreground/60 dark:text-gray-400 italic">
          Please be patient — you will be paid additional fare for your time :)
        </p>
        <Button size="sm" className="w-full text-xs h-8 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleComplete} data-testid="button-ss-complete-driver">
          Hopper Returned — End Stop
        </Button>
      </div>
    );
  }

  return null;
}

function RideChat({ hopId, currentUserId }: { hopId: number; currentUserId: number }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/ride-chat', hopId],
    refetchInterval: chatOpen ? 3000 : false,
    enabled: chatOpen,
  });

  const sendMsg = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest("POST", `/api/ride-chat/${hopId}`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ride-chat', hopId] });
      setChatInput("");
    },
  });

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  if (!chatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-700/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
        data-testid="button-open-ride-chat"
      >
        <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Chat with your ride partner</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200/50 dark:border-blue-700/30 overflow-hidden" data-testid="ride-chat-panel">
      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-950/30">
        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> Ride Chat
        </span>
        <button onClick={() => setChatOpen(false)} className="text-blue-400 hover:text-blue-600" data-testid="button-close-ride-chat">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="h-[140px] overflow-y-auto px-3 py-2 space-y-1.5 bg-white/50 dark:bg-black/20">
        {isLoading && <p className="text-[10px] text-muted-foreground text-center">Loading...</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-[10px] text-muted-foreground dark:text-gray-400 text-center py-4">No messages yet. Say hi!</p>
        )}
        {messages.map((m: any) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-2.5 py-1.5 rounded-xl text-[11px] ${
                isMe
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-muted dark:bg-white/10 text-foreground dark:text-white rounded-bl-sm"
              }`} data-testid={`chat-msg-${m.id}`}>
                {!isMe && <p className="text-[9px] font-bold opacity-70 mb-0.5">{m.senderUsername}</p>}
                <p>{m.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/30 dark:bg-white/5 border-t border-border/30">
        <Input
          placeholder="Type a message..."
          className="h-8 text-xs rounded-lg flex-1 dark:bg-white/5 dark:text-white"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && chatInput.trim()) sendMsg.mutate(chatInput.trim());
          }}
          data-testid="input-ride-chat"
        />
        <Button
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          disabled={!chatInput.trim() || sendMsg.isPending}
          onClick={() => { if (chatInput.trim()) sendMsg.mutate(chatInput.trim()); }}
          data-testid="button-send-chat"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
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
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapLoadedRef = useRef(false);
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

  const hopIdRef = useRef(hop.id);

  useEffect(() => {
    if (!mapContainerRef.current || !driverLat || !driverLng || !coordsValid || navMapErrorRef.current) return;
    if (mapRef.current && mapLoadedRef.current && hopIdRef.current === hop.id) return;
    hopIdRef.current = hop.id;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
      mapLoadedRef.current = false;
    }

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
      mapLoadedRef.current = true;
      const dm = new mapboxgl.Marker({ color: "#22c55e" })
        .setLngLat([driverLng!, driverLat!])
        .setPopup(new mapboxgl.Popup().setText("You"))
        .addTo(map);
      driverMarkerRef.current = dm;

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

    return () => {
      map.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [hop.id, hopLat, hopLng, endLat, endLng]);

  useEffect(() => {
    if (driverMarkerRef.current && driverLat && driverLng) {
      driverMarkerRef.current.setLngLat([driverLng, driverLat]);
    }
  }, [driverLat, driverLng]);

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
            <RideChat hopId={hop.id} currentUserId={hop.driverId || 0} />
            <PendingHopperPrompt />
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
              <>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30 rounded-xl p-2.5" data-testid="dropoff-instruction">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span>📍</span> Drop off at the exact destination pin
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/60 mt-0.5">Please take your hopper all the way to their destination marker.</p>
                </div>
                <SpontaneousStopDriver hopId={hop.id} />
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl"
                  onClick={async () => {
                    try {
                      await apiRequest("POST", `/api/hops/${hop.id}/complete`, {});
                      queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
                      showFlash("✅", "Ride completed!", "success");
                      onClose();
                      setTimeout(() => window.dispatchEvent(new CustomEvent("sh-ride-completed")), 300);
                    } catch {
                      showFlash("⚠️", "Couldn't complete ride", "error");
                    }
                  }}
                  data-testid="button-complete-ride"
                >
                  Complete Ride
                </Button>
              </>
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

function SavedLocationChips({ user, onSelect, mode, target }: { user: User; onSelect: (addr: string) => void; mode: "hopper" | "driver"; target: "start" | "end" }) {
  const hasHome = !!(user as any).homeAddress;
  const hasWork = !!(user as any).workAddress;
  const hasCustom = !!(user as any).customLocationAddress;

  return (
    <div className="flex items-center gap-1 flex-wrap px-1">
      {target === "start" && (
        <button
          type="button"
          onClick={() => onSelect("🌍 Current Location")}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-all"
          data-testid={`button-${mode}-${target}-current`}
        >
          🌍 Current
        </button>
      )}
      {hasHome && (
        <button
          type="button"
          onClick={() => onSelect((user as any).homeAddress)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all"
          data-testid={`button-${mode}-${target}-home`}
        >
          <Home className="w-3 h-3" /> Home
        </button>
      )}
      {hasWork && (
        <button
          type="button"
          onClick={() => onSelect((user as any).workAddress)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all"
          data-testid={`button-${mode}-${target}-work`}
        >
          <Briefcase className="w-3 h-3" /> Work
        </button>
      )}
      {hasCustom && (
        <button
          type="button"
          onClick={() => onSelect((user as any).customLocationAddress)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all"
          data-testid={`button-${mode}-${target}-fav`}
        >
          <Star className="w-3 h-3" /> {(user as any).customLocationName || "Fav"}
        </button>
      )}
    </div>
  );
}

function QuickLocationButtons({ user, onSelectStart, onSelectEnd, mode }: { user: User; onSelectStart: (addr: string) => void; onSelectEnd: (addr: string) => void; mode: "hopper" | "driver" }) {
  const hasHome = !!(user as any).homeAddress;
  const hasWork = !!(user as any).workAddress;
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all"
              data-testid={`button-${mode}-home-to-work`}
            >
              <Home className="w-3 h-3" /> → <Briefcase className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("work_to_home")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-700/40 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-all"
              data-testid={`button-${mode}-work-to-home`}
            >
              <Briefcase className="w-3 h-3" /> → <Home className="w-3 h-3" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowSetup(showSetup ? null : (!hasHome ? "home" : !hasWork ? "work" : "custom"))}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all"
          data-testid={`button-${mode}-set-location`}
        >
          <Settings2 className="w-3 h-3" /> {!hasHome ? "Set Home" : !hasWork ? "Set Work" : "Edit Saved"}
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
                <div className="flex-1">
                  <AddressAutocomplete
                    value={setupInput}
                    onChange={(val) => setSetupInput(val)}
                    placeholder={showSetup === "home" ? "Home address" : showSetup === "work" ? "Work address" : "Custom address"}
                    className="h-8 text-xs rounded-lg"
                    dataTestId={`input-${mode}-setup-address`}
                  />
                </div>
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
  const [driverStartInput, setDriverStartInput] = useState("");
  const [driverDestInput, setDriverDestInput] = useState("");
  const [driverDepartureMin, setDriverDepartureMin] = useState<number | null>(5);
  const [customTimeInput, setCustomTimeInput] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [routeGenerated, setRouteGenerated] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ endLat: number; endLng: number } | null>(null);
  const [activating, setActivating] = useState(false);

  const { data: driverStatus } = useQuery<DriverStatus>({
    queryKey: ['/api/driver/status'],
  });

  const { data: hops } = useHops();

  const updatePreferences = useMutation({
    mutationFn: async (updates: { availableSeats?: number }) => {
      await apiRequest("PUT", "/api/profile/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (payload: { active: boolean; startLat?: number; startLng?: number; endLat?: number; endLng?: number; startLocation?: string; endLocation?: string }) => {
      await apiRequest("POST", "/api/driver/active", payload);
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      showFlash(payload.active ? "🟢" : "🔴", payload.active ? "You're active!" : "You're offline", payload.active ? "success" : "info");
    },
    onError: (err: any) => {
      showFlash("⚠️", err?.message || "Can't toggle status", "error");
    },
  });

  const TUTORIAL_KEY = "sh-driver-tutorial-clicks";
  const [tutorialClicks, setTutorialClicks] = useState(() => parseInt(localStorage.getItem(TUTORIAL_KEY) || "0", 10));

  const isVerified = driverStatus?.driverVerified ?? false;
  const isActiveNow = driverStatus?.isActive ?? false;
  const appStatus = driverStatus?.applicationStatus;
  const needsOnboarding = !driverStatus?.vehicleMake && !appStatus;

  const activeDriverHops = hops?.filter(h => h.status === 'matched' || h.status === 'in_ride') || [];
  const activeDriverHop = activeDriverHops[0];

  useLiveLocationBroadcast(isActiveNow || !!activeDriverHop);

  useEffect(() => {
    if (!geo.permitted) geo.requestPermission();
  }, [geo.permitted]);

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
      setRouteCoords({ endLat, endLng });
      setRouteGenerated(true);
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
      setRouteCoords(null);
    }
  }, [driverDestInput, geo.latitude, geo.longitude]);

  const canGoActive = driverDestInput.trim().length > 0 && routeGenerated && driverDepartureMin !== null;

  const handleGoActive = async () => {
    if (!canGoActive) return;
    setActivating(true);
    try {
      toggleActive.mutate({
        active: true,
        startLat: geo.latitude || undefined,
        startLng: geo.longitude || undefined,
        endLat: routeCoords?.endLat,
        endLng: routeCoords?.endLng,
        startLocation: driverStartInput || "Current Location",
        endLocation: driverDestInput,
      });
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <p className="text-base font-extrabold text-foreground dark:text-orange-400 dark:[text-shadow:0_0_6px_rgba(249,115,22,0.7),0_0_2px_rgba(0,0,0,0.8)] text-center" data-testid="text-driver-greeting">
          happy driving,{" "}
          <span className="font-black text-foreground dark:text-orange-300 dark:[text-shadow:0_0_8px_rgba(249,115,22,0.8),0_0_2px_rgba(0,0,0,0.9)]">{user.username}</span>
        </p>
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
        <Card className="border-yellow-200 dark:border-yellow-700/40 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-2xl" data-testid="card-pending-verification">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">Verification Pending</p>
              <p className="text-[10px] text-muted-foreground dark:text-gray-300">Your application is under review.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {appStatus === "rejected" && (
        <Card className="border-red-200 dark:border-red-700/40 bg-red-50/50 dark:bg-red-900/20 rounded-2xl" data-testid="card-rejected">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Not Approved</p>
              <p className="text-[10px] text-muted-foreground dark:text-gray-300">Update your info and reapply.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => setLocation("/driver-onboarding")} data-testid="button-reapply">
              Reapply
            </Button>
          </CardContent>
        </Card>
      )}

      {isVerified && !isActiveNow && tutorialClicks < 3 && (
          <Card className="border-green-400/50 dark:border-green-600/30 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/10 rounded-2xl overflow-hidden" data-testid="card-driver-tutorial">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">Welcome, Driver!</p>
                  <p className="text-xs text-green-700/80 dark:text-green-400/70 leading-relaxed">
                    Just follow the map and use Short Hop to navigate to your destination — we'll make sure you get there and get paid!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-700/20 rounded-xl px-3 py-2">
                <span className="text-base">🐦</span>
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  The Early Bird gets the Hop! Short Hop works better for drivers that head out early.
                </p>
              </div>
              <button
                type="button"
                className="w-full text-[10px] text-green-600/60 dark:text-green-500/50 hover:text-green-700 dark:hover:text-green-400 transition-colors py-1"
                onClick={() => {
                  const next = tutorialClicks + 1;
                  localStorage.setItem(TUTORIAL_KEY, String(next));
                  setTutorialClicks(next);
                }}
                data-testid="button-dismiss-tutorial"
              >
                Got it ({3 - tutorialClicks} {3 - tutorialClicks === 1 ? "tap" : "taps"} to dismiss)
              </button>
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
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse z-10" />
              {driverStartInput === "🌍 Current Location" ? (
                <div
                  className="h-11 text-sm font-bold rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-700/40 pl-9 pr-3 flex items-center justify-between text-green-700 dark:text-green-400 cursor-pointer"
                  data-testid="display-driver-start"
                  onClick={() => setDriverStartInput("")}
                >
                  <span>🌍 Current Location</span>
                  <span className="text-[10px] text-muted-foreground ml-1">tap to edit</span>
                </div>
              ) : (
                <AddressAutocomplete
                  value={driverStartInput}
                  onChange={(val) => setDriverStartInput(val)}
                  placeholder="Enter pickup address..."
                  className="h-11 text-sm rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-700/40 pl-9 font-semibold"
                  dataTestId="input-driver-start"
                />
              )}
            </div>
            <SavedLocationChips user={user} onSelect={(addr) => setDriverStartInput(addr)} mode="driver" target="start" />
          </div>
          <div className="space-y-1.5">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm bg-orange-500 z-10" />
              <AddressAutocomplete
                value={driverDestInput}
                onChange={(val) => setDriverDestInput(val)}
                placeholder="Where are you headed?"
                className="h-11 text-sm rounded-xl bg-muted/40 dark:bg-white/5 border-border/50 dark:border-white/10 pl-9 focus:bg-background dark:text-white font-semibold"
                dataTestId="input-driver-destination"
              />
            </div>
            <SavedLocationChips user={user} onSelect={(addr) => setDriverDestInput(addr)} mode="driver" target="end" />
          </div>

          {routeGenerated && routeInfo && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 rounded-lg p-2 border border-green-200/50 dark:border-green-700/30">
              <Navigation className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-[11px] font-bold text-green-700 dark:text-green-400">Route: {routeInfo.distance} · {routeInfo.eta}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-foreground/50 dark:text-gray-400 shrink-0" />
              <span className="text-[11px] text-foreground/60 dark:text-gray-300">How long until you head out?</span>
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
                      : "bg-muted/50 text-foreground/60 dark:text-gray-300 hover:bg-muted"
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
              <SeatIcon className="w-10 h-10" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-foreground dark:text-white">0/{(user as any)?.availableSeats || 1}</span>
                <AnimatePresence mode="popLayout">
                  {Array.from({ length: Math.min((user as any)?.availableSeats || 1, 5) }).map((_, i) => (
                    <motion.span
                      key={`seat-dollar-${i}-${(user as any)?.availableSeats}`}
                      initial={{ y: 8, opacity: 0, scale: 0 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -8, opacity: 0, scale: 0 }}
                      transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 15 }}
                      className={`text-[10px] font-black ${i < 2 ? "text-green-400" : i < 4 ? "text-green-500" : "text-emerald-500"}`}
                    >$</motion.span>
                  ))}
                </AnimatePresence>
              </div>
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
                disabled={(user as any)?.availableSeats >= 50}
                onClick={() => {
                  const current = (user as any)?.availableSeats || 1;
                  if (current < 50) updatePreferences.mutate({ availableSeats: current + 1 });
                }}
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-1 py-1.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-foreground/50 dark:text-gray-400 shrink-0" />
              <span className="text-[11px] font-medium text-foreground dark:text-white">Match Mode</span>
            </div>
            <div className="flex gap-1" data-testid="toggle-match-preference">
              <button
                type="button"
                onClick={async () => {
                  if ((user as any).matchPreference === "one_rider") return;
                  try {
                    await apiRequest("PATCH", "/api/user/match-preference", { matchPreference: "one_rider" });
                    queryClient.invalidateQueries({ queryKey: ['/api/me'] });
                  } catch {}
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                  ((user as any).matchPreference || "one_rider") === "one_rider"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted/50 text-foreground/60 dark:text-gray-300 hover:bg-muted"
                }`}
                data-testid="button-match-one_rider"
              >
                One Rider
                <motion.span
                  key="one-dollar"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[11px] font-black text-green-300"
                >$</motion.span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if ((user as any).matchPreference === "maximize_seats") return;
                  try {
                    await apiRequest("PATCH", "/api/user/match-preference", { matchPreference: "maximize_seats" });
                    queryClient.invalidateQueries({ queryKey: ['/api/me'] });
                  } catch {}
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                  ((user as any).matchPreference || "one_rider") === "maximize_seats"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm shadow-green-500/30"
                    : "bg-muted/50 text-foreground/60 dark:text-gray-300 hover:bg-muted"
                }`}
                data-testid="button-match-maximize_seats"
              >
                Fill Seats
                <span className="flex items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={`money-${i}`}
                      initial={{ y: 6, opacity: 0, scale: 0.3 }}
                      animate={{ y: [6, -4, 0], opacity: 1, scale: [0.3, 1.3, 1] }}
                      transition={{ delay: i * 0.12, duration: 0.4, repeat: Infinity, repeatDelay: 2.5 }}
                      className="text-[11px] font-black text-green-300"
                    >$</motion.span>
                  ))}
                </span>
              </button>
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
            <p className="text-[10px] text-foreground/50 dark:text-gray-400 text-center">
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
  const { isDark } = useTheme();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const cancelHop = useCancelHop();
  const geo = useGeolocation();
  const [greetingVisible, setGreetingVisible] = useState(true);

  const { data: driverStatusTop } = useQuery<DriverStatus>({
    queryKey: ['/api/driver/status'],
    refetchInterval: 5000,
  });
  const isDriverActive = driverStatusTop?.isActive ?? false;

  const [driverNavRoute, setDriverNavRoute] = useState<DriverNavRoute | null>(null);
  const [driverRouteInfo, setDriverRouteInfo] = useState<{ distance: string; eta: string } | null>(null);
  const prevRouteKeyRef = useRef<string>("");

  useEffect(() => {
    const handler = () => setTimeout(() => setLocation("/community"), 400);
    window.addEventListener("sh-ride-completed", handler);
    return () => window.removeEventListener("sh-ride-completed", handler);
  }, [setLocation]);

  const driverActiveHops = hops?.filter(h =>
    (h.status === "matched" || h.status === "in_ride") && h.driverId === user.id
  ) || [];
  const driverActiveHop = driverActiveHops[0] || null;

  useEffect(() => {
    if (!isDriverActive || !geo.latitude || !geo.longitude) {
      if (driverNavRoute) setDriverNavRoute(null);
      if (driverRouteInfo) setDriverRouteInfo(null);
      prevRouteKeyRef.current = "";
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    const buildRoute = async () => {
      try {
        const routeRes = await fetch("/api/driver/routine-routes", { credentials: "include" });
        if (!routeRes.ok) return;
        const routes = await routeRes.json();
        if (!routes.length) return;
        const route = routes[0];
        const destLat = parseFloat(route.endLat);
        const destLng = parseFloat(route.endLng);
        if (!isFinite(destLat) || !isFinite(destLng)) return;

        let waypoints = `${geo.longitude},${geo.latitude}`;
        let pickupMarker: DriverNavRoute["pickupMarker"];
        let dropoffMarker: DriverNavRoute["dropoffMarker"];

        if (driverActiveHop) {
          const pLat = parseFloat(driverActiveHop.startLat || "0");
          const pLng = parseFloat(driverActiveHop.startLng || "0");
          const dLat = parseFloat(driverActiveHop.endLat || "0");
          const dLng = parseFloat(driverActiveHop.endLng || "0");

          if (driverActiveHop.status === "matched" && isFinite(pLat) && pLat !== 0) {
            waypoints += `;${pLng},${pLat}`;
            pickupMarker = { lat: pLat, lng: pLng, label: "Pickup" };
          }
          if (isFinite(dLat) && dLat !== 0) {
            waypoints += `;${dLng},${dLat}`;
            dropoffMarker = { lat: dLat, lng: dLng, label: "Dropoff" };
          }
        }

        waypoints += `;${destLng},${destLat}`;

        const routeKey = waypoints;
        if (routeKey === prevRouteKeyRef.current) return;
        prevRouteKeyRef.current = routeKey;

        const dirRes = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${token}`
        );
        const dirJson = await dirRes.json();
        if (!dirJson.routes?.[0]) return;

        const r = dirJson.routes[0];
        const distMiles = (r.distance / 1609.34).toFixed(1);
        const etaMins = Math.round(r.duration / 60);

        setDriverRouteInfo({ distance: `${distMiles} mi`, eta: `${etaMins} min` });
        setDriverNavRoute({
          geometry: r.geometry,
          pickupMarker,
          dropoffMarker,
          destMarkerCoord: { lat: destLat, lng: destLng },
        });
      } catch {}
    };

    buildRoute();
    const interval = setInterval(buildRoute, 15000);
    return () => clearInterval(interval);
  }, [isDriverActive, geo.latitude, geo.longitude, driverActiveHop?.id, driverActiveHop?.status]);

  const toggleActiveTop = useMutation({
    mutationFn: async (active: boolean) => {
      await apiRequest("POST", "/api/driver/active", { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      setDriverNavRoute(null);
      setDriverRouteInfo(null);
      prevRouteKeyRef.current = "";
      showFlash("🔴", "You're offline", "info");
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: { seatsNeeded?: number }) => {
      await apiRequest("PUT", "/api/profile/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
  });
  const { data: pendingRating } = useQuery<{
    tripId: number; partnerId: number; partnerName: string; partnerPhoto: string | null;
    partnerRideVibe: string; partnerInterests: string[]; partnerBio: string | null;
    role: string; distanceMiles: string; priceCents: number;
  } | null>({
    queryKey: ['/api/pending-rating'],
  });

  const [ratingTripId, setRatingTripId] = useState<number | null>(null);
  const [ratingDismissCount, setRatingDismissCount] = useState(0);
  const [ratingFullyDismissed, setRatingFullyDismissed] = useState(false);

  useEffect(() => {
    if (!pendingRating) return;
    const tid = pendingRating.tripId;
    if (tid !== ratingTripId) {
      setRatingTripId(tid);
      try {
        const stored = sessionStorage.getItem(`sh_rating_dismissed_${tid}`);
        if (stored === '1') {
          setRatingFullyDismissed(true);
          setRatingDismissCount(3);
        } else {
          const cnt = parseInt(sessionStorage.getItem(`sh_rating_cnt_${tid}`) || '0', 10);
          setRatingDismissCount(cnt);
          setRatingFullyDismissed(false);
        }
      } catch {
        setRatingDismissCount(0);
        setRatingFullyDismissed(false);
      }
    }
  }, [pendingRating?.tripId, ratingTripId]);

  const handleRatingDismiss = useCallback(() => {
    const next = ratingDismissCount + 1;
    setRatingDismissCount(next);
    const tid = pendingRating?.tripId;
    if (tid) {
      try { sessionStorage.setItem(`sh_rating_cnt_${tid}`, String(next)); } catch {}
    }
    if (next >= 3) {
      setRatingFullyDismissed(true);
      if (tid) {
        try { sessionStorage.setItem(`sh_rating_dismissed_${tid}`, '1'); } catch {}
        apiRequest("POST", `/api/pending-rating/${tid}/dismiss`, {}).then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/pending-rating'] });
        }).catch(() => {});
      }
    }
  }, [ratingDismissCount, pendingRating?.tripId, queryClient]);

  const showRatingBanner = !!pendingRating && !ratingFullyDismissed;

  const userModeLock = user?.modeLock || "none";
  const [mode, setMode] = useState<HopMode>(() => {
    try {
      if (userModeLock === "hopper_only") return "hop";
      if (userModeLock === "driver_only") return "drive";
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
  const [repeatRouteVisible, setRepeatRouteVisible] = useState(true);

  const prevDriverHopCountRef = useRef(driverActiveHops.length);
  const driverMatchAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (mode !== "drive") return;
    if (driverActiveHops.length > prevDriverHopCountRef.current) {
      if (!driverMatchAudioRef.current) {
        driverMatchAudioRef.current = new Audio("/driver-approaching-alert.m4a");
        driverMatchAudioRef.current.volume = 0.8;
      }
      driverMatchAudioRef.current.currentTime = 0;
      driverMatchAudioRef.current.play().catch(() => {});
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      prevRouteKeyRef.current = "";
    }
    prevDriverHopCountRef.current = driverActiveHops.length;
  }, [driverActiveHops.length, mode]);

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

  const { gpsState, declineSuggestion } = useMagicGps({
    enabled: magicGpsActiveForHopper,
    flowModeEnabled: magicGpsActiveForHopper && !!user.flowModeEnabled,
    savedRoutes: magicGpsRoutes,
    onSuggestion: handleMagicGpsSuggestion,
    onFlowModeActivate: handleFlowModeActivate,
  });

  useEffect(() => {
    if (userModeLock === "hopper_only" && mode === "drive") setMode("hop");
    if (userModeLock === "driver_only" && mode !== "drive") setMode("drive");
  }, [userModeLock]);

  useEffect(() => {
    function onModeChange(e: Event) {
      const tab = (e as CustomEvent).detail;
      if (tab === "driver" && userModeLock !== "hopper_only") setMode("drive");
      else if (tab === "hopper" && userModeLock !== "driver_only" && mode === "drive") setMode("hop");
    }
    window.addEventListener("sh-mode-change", onModeChange);
    return () => window.removeEventListener("sh-mode-change", onModeChange);
  }, [mode, userModeLock]);

  const activeHop = hops?.find(h => {
    if (h.status === "completed" || h.status === "cancelled") return false;
    if (mode === "hop") return h.walkerId === user.id;
    if (mode === "drive") return h.driverId === user.id;
    return true;
  }) || hops?.find(h => h.status !== "completed" && h.status !== "cancelled");

  const [proximityAlerted, setProximityAlerted] = useState<{ pickup: boolean; dropoff: boolean }>({ pickup: false, dropoff: false });
  const proximityAudioRef = useRef<HTMLAudioElement | null>(null);
  const proximitySoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pickupTimerStart, setPickupTimerStart] = useState<number | null>(null);
  const [pickupTimerRemaining, setPickupTimerRemaining] = useState<number | null>(null);

  const hasActiveRide = !!(activeHop && (activeHop.status === "matched" || activeHop.status === "in_ride"));
  const prevHasActiveRideRef = useRef(hasActiveRide);
  useEffect(() => {
    if (prevHasActiveRideRef.current && !hasActiveRide && mode === "hop") {
      setTimeout(() => setLocation("/community"), 600);
    }
    prevHasActiveRideRef.current = hasActiveRide;
  }, [hasActiveRide, mode, setLocation]);
  useLiveLocationBroadcast(hasActiveRide || mode === "drive");
  const tracking = useHopTracking(activeHop?.id, hasActiveRide);

  const PROXIMITY_THRESHOLD = 0.189;

  useEffect(() => {
    if (!hasActiveRide || !tracking.available || !tracking.distance) return;

    if (tracking.distance <= PROXIMITY_THRESHOLD && !proximityAlerted.pickup && tracking.hopStatus === "matched") {
      setProximityAlerted(prev => ({ ...prev, pickup: true }));
      if (!proximityAudioRef.current) {
        proximityAudioRef.current = new Audio("/driver-approaching-alert.m4a");
        proximityAudioRef.current.volume = 0.9;
      }
      if (proximitySoundTimerRef.current) {
        clearTimeout(proximitySoundTimerRef.current);
        proximitySoundTimerRef.current = null;
      }
      proximityAudioRef.current.currentTime = 0;
      proximityAudioRef.current.play().catch(() => {});
      const soundDur = getDriverSoundDuration();
      const durationMs = soundDur === "short" ? 3000 : 8000;
      proximitySoundTimerRef.current = setTimeout(() => {
        if (proximityAudioRef.current) {
          proximityAudioRef.current.pause();
          proximityAudioRef.current.currentTime = 0;
        }
      }, durationMs);

      setPickupTimerStart(Date.now());

      showFlash("🚗", "Your driver is within 1000ft!", "success");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Short Hop", { body: "Your driver is within 1000ft of pickup!", icon: "/favicon.png", tag: "sh-proximity" });
      }
    }

    if (tracking.hopStatus === "in_ride" && tracking.dropoffLat && tracking.dropoffLng && tracking.partnerLat && tracking.partnerLng) {
      const distToDropoff = calcDistance(tracking.partnerLat, tracking.partnerLng, tracking.dropoffLat, tracking.dropoffLng);
      if (distToDropoff <= PROXIMITY_THRESHOLD && !proximityAlerted.dropoff) {
        setProximityAlerted(prev => ({ ...prev, dropoff: true }));
        if (!proximityAudioRef.current) {
          proximityAudioRef.current = new Audio("/driver-approaching-alert.m4a");
          proximityAudioRef.current.volume = 0.9;
        }
        proximityAudioRef.current.currentTime = 0;
        proximityAudioRef.current.play().catch(() => {});
        const soundDur = getDriverSoundDuration();
        const durationMs = soundDur === "short" ? 3000 : 8000;
        if (proximitySoundTimerRef.current) clearTimeout(proximitySoundTimerRef.current);
        proximitySoundTimerRef.current = setTimeout(() => {
          if (proximityAudioRef.current) {
            proximityAudioRef.current.pause();
            proximityAudioRef.current.currentTime = 0;
          }
        }, durationMs);
        showFlash("📍", "Approaching your destination!", "success");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Short Hop", { body: "Almost at your destination!", icon: "/favicon.png", tag: "sh-proximity-dropoff" });
        }
      }
    }
  }, [hasActiveRide, tracking, proximityAlerted]);

  useEffect(() => {
    if (!pickupTimerStart || activeHop?.status !== "matched") {
      setPickupTimerRemaining(null);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - pickupTimerStart) / 1000;
      const remaining = Math.max(0, 180 - elapsed);
      setPickupTimerRemaining(Math.ceil(remaining));
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [pickupTimerStart, activeHop?.status]);

  useEffect(() => {
    if (!hasActiveRide) {
      setProximityAlerted({ pickup: false, dropoff: false });
      setPickupTimerStart(null);
      setPickupTimerRemaining(null);
    }
  }, [hasActiveRide]);


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
          showFlash("✅", "Card saved! You're ready to hop.", "success");
        }).catch(() => {
          showFlash("⚠️", "Card setup verification failed. Please try again.", "error");
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

      const priceCents = Math.max(Math.round(distanceMiles * 150), 150);

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

  const submitHopAfterPayment = (authData: any, paymentStatus: string) => {
    const data = form.getValues();
    if (!pricePreview) return;

    setPrepaidInfo({
      amount: authData.amount,
      paymentIntentId: authData.paymentIntentId,
      departureTime: authData.departureTime,
      arrivalDeadline: authData.arrivalDeadline,
      timeWindowExpiry: authData.timeWindowExpiry,
      distanceMiles: pricePreview.distanceMiles,
    });

    setIsMatching(true);
    const hopData: any = {
      ...data,
      startLocation: pricePreview.startName,
      hopType: 'short_hop',
      distanceMiles: String(pricePreview.distanceMiles),
      startLat: String(pricePreview.startLat),
      startLng: String(pricePreview.startLng),
      endLat: String(pricePreview.endLat),
      endLng: String(pricePreview.endLng),
      paymentIntentId: authData.paymentIntentId,
      paymentStatus,
      paymentAmountCents: authData.amount,
      departureTime: authData.departureTime,
      arrivalDeadline: authData.arrivalDeadline,
      timeWindowExpiry: authData.timeWindowExpiry,
    };

    setPricePreview(null);
    requestHop.mutate(hopData, {
      onSuccess: () => {
        showFlash("⚡", "Paid & requesting your hop!", "success");
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      },
      onError: async () => {
        setIsMatching(false);
        setPrepaidInfo(null);
        if (authData.paymentIntentId) {
          try {
            await apiRequest("POST", "/api/stripe/refund-failed-hop", { paymentIntentId: authData.paymentIntentId });
            showFlash("💳", "Payment reversed — please try again", "info");
            setPaymentRefunded(true);
          } catch {
            showFlash("⚠️", "Hop failed. Contact support if charged.", "error");
          }
        }
      }
    });
  };

  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const confirmAndPay = async () => {
    if (!pricePreview || isAuthorizing) return;
    setIsAuthorizing(true);

    if (!user.stripeSetupCompleted) {
      try {
        const setupRes = await apiRequest("POST", "/api/stripe/setup-fee", {});
        const setupJson = await setupRes.json();
        if (setupJson.url) {
          setCardHoldUrl(setupJson.url);
          showFlash("💳", "Add a card on file before continuing", "info");
          setIsAuthorizing(false);
          return;
        }
      } catch (e) {
        showFlash("❌", "Card setup failed", "error");
        setIsAuthorizing(false);
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

      if (authData.needsSetup) {
        try {
          const setupRes = await apiRequest("POST", "/api/stripe/setup-fee", {});
          const setupJson = await setupRes.json();
          if (setupJson.url) {
            setCardHoldUrl(setupJson.url);
            showFlash("💳", "Please add a card to continue", "info");
            setIsAuthorizing(false);
            return;
          }
        } catch (e) {
          showFlash("❌", "Card setup failed", "error");
          setIsAuthorizing(false);
          return;
        }
      }

      setIsAuthorizing(false);
      submitHopAfterPayment(authData, "authorized");
    } catch (authErr: any) {
      const errBody = authErr.message || "Payment failed";
      if (errBody.includes("No payment method") || errBody.includes("needsSetup")) {
        try {
          const setupRes = await apiRequest("POST", "/api/stripe/setup-fee", {});
          const setupJson = await setupRes.json();
          if (setupJson.url) {
            setCardHoldUrl(setupJson.url);
            showFlash("💳", "Please add a card to continue", "info");
            setIsAuthorizing(false);
            return;
          }
        } catch (e) {}
      }
      setIsAuthorizing(false);
      showFlash("❌", errBody, "error");
    }
  };

  const payWithWheels = async () => {
    if (!pricePreview) return;
    const wheelsCost = pricePreview.priceCents / 100;
    const userWheels = user.credits || 0;

    if (userWheels < wheelsCost) {
      showFlash("🛞", `Not enough Wheels. You have ${userWheels.toFixed(2)} but need ${wheelsCost.toFixed(2)}.`, "error");
      return;
    }

    setPaymentRefunded(false);
    try {
      const res = await apiRequest("POST", "/api/stripe/pay-with-wheels", {
        distanceMiles: pricePreview.distanceMiles,
        departureTime: new Date(Date.now() + departureMinutes * 60000).toISOString(),
        arrivalDeadline: new Date(Date.now() + (departureMinutes + 45) * 60000).toISOString(),
      });
      const data = await res.json();
      submitHopAfterPayment(data, "wheels");
      showFlash("🛞", `Paid ${wheelsCost.toFixed(2)} Wheels!`, "success");
    } catch (e: any) {
      showFlash("❌", e.message || "Wheel payment failed", "error");
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


      <div className="fixed inset-0 top-0 bottom-[4rem] flex flex-col">
        <MapView mode={mode} latitude={geo.latitude} longitude={geo.longitude} hasMatchedRide={!!(activeHop && (activeHop.status === "matched" || activeHop.status === "in_ride"))} rideStatus={activeHop?.status} walkingRoute={walkingRoute} driverNavRoute={isDriverMode && isDriverActive ? driverNavRoute : null} isDark={isDark} />

        <AnimatePresence>
          {!isDriverMode && pricePreview && !isMatching && (
            <motion.div
              key="top-trip-summary"
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute top-0 left-0 right-0 z-30 px-3 pt-3"
              data-testid="top-trip-summary"
            >
              <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-green-200/40 dark:border-green-700/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground dark:text-white flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-green-500" /> Trip Summary
                  </p>
                  <button onClick={() => setPricePreview(null)} className="text-muted-foreground hover:text-foreground p-1" data-testid="button-close-top-preview">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <div className="w-px h-4 bg-border dark:bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-[11px] text-foreground/70 dark:text-gray-300 truncate">{pricePreview.startName || "Current location"}</p>
                    <p className="text-[11px] text-foreground/70 dark:text-gray-300 truncate">{pricePreview.endName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-muted/20 dark:bg-white/5 rounded-xl px-3 py-2">
                  <div className="text-center">
                    <p className="text-base font-black text-foreground dark:text-white" data-testid="text-top-preview-distance">{pricePreview.distanceMiles.toFixed(1)} mi</p>
                    <p className="text-[9px] text-muted-foreground dark:text-gray-500">distance</p>
                  </div>
                  <div className="w-px h-6 bg-border dark:bg-white/10" />
                  <div className="text-center">
                    <p className="text-base font-black text-foreground dark:text-white" data-testid="text-top-preview-eta">{pricePreview.etaMinutes} min</p>
                    <p className="text-[9px] text-muted-foreground dark:text-gray-500">est. time</p>
                  </div>
                  <div className="w-px h-6 bg-border dark:bg-white/10" />
                  <div className="text-center">
                    <p className="text-base font-black text-green-600 dark:text-green-400" data-testid="text-top-preview-price">${(pricePreview.priceCents / 100).toFixed(2)}</p>
                    <p className="text-[9px] text-muted-foreground dark:text-gray-500">total</p>
                  </div>
                </div>
                <p className="text-[9px] text-center text-muted-foreground dark:text-gray-500">$1.50/mile · $1.50 minimum · charged immediately</p>
                <div className="space-y-1.5">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm h-10 rounded-xl"
                    onClick={confirmAndPay}
                    disabled={requestHop.isPending || isAuthorizing}
                    data-testid="button-top-confirm-pay"
                  >
                    {requestHop.isPending || isAuthorizing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {isAuthorizing ? "Processing..." : `Confirm & Pay $${(pricePreview.priceCents / 100).toFixed(2)}`}
                  </Button>
                  {(user.credits || 0) > 0 && (
                    <Button
                      variant="outline"
                      className={`w-full font-bold text-xs h-9 rounded-xl border-2 ${
                        (user.credits || 0) >= pricePreview.priceCents / 100
                          ? "border-amber-500/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          : "border-muted text-muted-foreground opacity-60 cursor-not-allowed"
                      }`}
                      onClick={payWithWheels}
                      disabled={requestHop.isPending || isAuthorizing || (user.credits || 0) < pricePreview.priceCents / 100}
                      data-testid="button-top-pay-wheels"
                    >
                      🛞 Pay with {(pricePreview.priceCents / 100).toFixed(2)} Wheels
                      <span className="text-[10px] ml-1.5 opacity-70">(bal: {(user.credits || 0).toFixed(2)})</span>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {!isDriverMode && isMatching && prepaidInfo && (
            <motion.div
              key="top-matching-banner"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute top-0 left-0 right-0 z-30 px-3 pt-3"
              data-testid="top-matching-banner"
            >
              <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-2xl shadow-lg border border-blue-200/40 dark:border-blue-700/30 px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground dark:text-white truncate">Waiting for a match...</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">${(prepaidInfo.amount / 100).toFixed(2)} authorized</p>
                  </div>
                </div>
                {matchCountdown !== null && (
                  <span className="text-xs font-mono font-bold text-foreground dark:text-white shrink-0 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-lg" data-testid="text-top-match-countdown">
                    {Math.floor(matchCountdown / 60)}:{String(matchCountdown % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
        {(!isDriverMode && hasActiveRide && activeHop) ? (
          null
        ) : isDriverMode && isDriverActive ? (
          <DriverNavBar
            key="driver-nav"
            user={user}
            hop={driverActiveHop}
            routeInfo={driverRouteInfo}
            onStop={() => toggleActiveTop.mutate(false)}
            onStartRide={async (hopId) => {
              try {
                await apiRequest("POST", `/api/hops/${hopId}/start-ride`);
                queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
                prevRouteKeyRef.current = "";
                showFlash("🚗", "Ride started!", "success");
              } catch {
                showFlash("⚠️", "Couldn't start ride", "error");
              }
            }}
            onCompleteRide={async (hopId) => {
              try {
                await apiRequest("POST", `/api/hops/${hopId}/complete`, {});
                queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
                prevRouteKeyRef.current = "";
                showFlash("✅", "Ride completed!", "success");
                setTimeout(() => setLocation("/community"), 600);
              } catch {
                showFlash("⚠️", "Couldn't complete ride", "error");
              }
            }}
          />
        ) : (
        <motion.div
          key="control-panel"
          className="absolute bottom-0 left-0 right-0 bg-white/97 dark:bg-black/97 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-border/30 dark:border-white/10 z-20"
          style={{ height: "40%" }}
          data-testid="control-panel"
          initial={{ y: 0 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="px-4 pt-3 pb-2 h-full overflow-y-auto">
            {isDriverMode ? (
              <>
                <DriveNowPanel user={user} />
              </>
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
                          className="text-base font-extrabold text-center mb-1 text-foreground dark:text-orange-400 dark:[text-shadow:0_0_6px_rgba(249,115,22,0.7),0_0_2px_rgba(0,0,0,0.8)]"
                          data-testid="text-instahop-greeting"
                        >
                          happy hopping,{" "}
                          <span className="font-black text-foreground dark:text-orange-300 dark:[text-shadow:0_0_8px_rgba(249,115,22,0.8),0_0_2px_rgba(0,0,0,0.9)]">{user.username}</span>
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
                      <p className="text-sm font-bold text-foreground">Add Your Card</p>
                      <p className="text-xs text-muted-foreground dark:text-gray-300">Save a card on file to pay for rides. No charge until you hop.</p>
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9"
                        onClick={() => window.location.href = cardHoldUrl}
                        data-testid="button-verify-card"
                      >
                        Add Card
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
                      <p className="text-xs text-muted-foreground dark:text-gray-300">Trips over 10 miles use Plan a Ride in Tailor for prepayment.</p>
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


                {!isMatching && !pricePreview && !hasActiveRide && mode === "hop" && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mb-1 bg-gray-50 dark:bg-gray-900/40 text-foreground/70 dark:text-gray-200 border border-border/30" data-testid="display-driver-availability">
                    <Car className="w-3.5 h-3.5 shrink-0" />
                    <span>Submit your request — we'll match you when a driver is available</span>
                  </div>
                )}

                {isMatching && prepaidInfo && (
                  <div className="mb-2 space-y-2" data-testid="card-matching-countdown">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-9 rounded-xl border-red-200/50 dark:border-red-700/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
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
                      <X className="w-3.5 h-3.5 mr-1.5" /> Cancel & Refund
                    </Button>
                    <p className="text-[10px] text-center text-foreground/50 dark:text-gray-500">
                      Refunded automatically if no match found
                    </p>
                  </div>
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
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse z-10" />
                        {form.watch("startLocation") === "🌍 Current Location" ? (
                          <div
                            className="h-11 text-sm font-bold rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-700/40 pl-9 pr-3 flex items-center justify-between text-green-700 dark:text-green-400 cursor-pointer"
                            data-testid="display-instahop-start"
                            onClick={() => form.setValue("startLocation", "")}
                          >
                            <span>🌍 Current Location</span>
                            <span className="text-[10px] text-muted-foreground ml-1">tap to edit</span>
                          </div>
                        ) : (
                          <AddressAutocomplete
                            value={form.watch("startLocation") || ""}
                            onChange={(val) => form.setValue("startLocation", val)}
                            placeholder="Enter pickup address..."
                            className="h-11 text-sm rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-700/40 pl-9 font-semibold"
                            dataTestId="input-instahop-start"
                          />
                        )}
                        <input type="hidden" {...form.register("startLocation")} />
                      </div>
                      {walkingInfo && form.watch("startLocation") && (
                        <div className="flex items-center gap-1 px-1">
                          <span className="text-[10px] font-semibold text-orange-500">{walkingInfo.duration} · {walkingInfo.distance}</span>
                        </div>
                      )}
                      <SavedLocationChips user={user} onSelect={(addr) => form.setValue("startLocation", addr)} mode="hopper" target="start" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm bg-orange-500 z-10" />
                        <AddressAutocomplete
                          value={form.watch("endLocation") || ""}
                          onChange={(val) => form.setValue("endLocation", val)}
                          placeholder="Where to?"
                          className="h-11 text-sm rounded-xl bg-muted/40 dark:bg-white/5 border-border/50 dark:border-white/10 pl-9 focus:bg-background dark:text-white font-semibold"
                          dataTestId="input-instahop-destination"
                        />
                      </div>
                      <SavedLocationChips user={user} onSelect={(addr) => form.setValue("endLocation", addr)} mode="hopper" target="end" />
                    </div>
                  </div>

                  {mode === "hop" && !isMatching && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <Clock className="w-3.5 h-3.5 text-foreground/50 dark:text-foreground/60 shrink-0" />
                        <span className="text-[11px] text-foreground/60 dark:text-foreground/70 whitespace-nowrap">Depart in</span>
                        <div className="flex flex-wrap gap-1">
                          {DEPARTURE_OPTIONS.filter(o => o.value !== -1).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDepartureMinutes(opt.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                departureMinutes === opt.value
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-muted/50 text-foreground/60 dark:text-gray-300 hover:bg-muted"
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
                          <SeatIcon className="w-8 h-8" />
                          <span className="text-[11px] text-foreground/60 dark:text-foreground/70">{(user as any)?.seatsNeeded || 1} seat{((user as any)?.seatsNeeded || 1) > 1 ? "s" : ""}</span>
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
                            disabled={(user as any)?.seatsNeeded >= 50}
                            onClick={() => {
                              const current = (user as any)?.seatsNeeded || 1;
                              if (current < 50) updatePreferences.mutate({ seatsNeeded: current + 1 });
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
        </motion.div>
        )}
        </AnimatePresence>

        {!isDriverMode && hasActiveRide && activeHop && (
          <HopperRidePanel
            activeHop={activeHop}
            user={user}
            tracking={tracking}
            pickupTimerRemaining={pickupTimerRemaining}
            queryClient={queryClient}
          />
        )}
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
