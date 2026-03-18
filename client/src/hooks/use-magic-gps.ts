import { useState, useEffect, useRef, useCallback } from "react";

export interface GpsState {
  speed: number | null;
  bearing: number | null;
  lat: number | null;
  lng: number | null;
  movementType: "stationary" | "walking" | "driving" | null;
  isTracking: boolean;
  lastUpdate: number | null;
}

export interface SavedRouteMatch {
  routeId: number;
  routeName: string;
  address: string;
  bearing: number;
  confidence: number;
}

interface UseMagicGpsOptions {
  enabled: boolean;
  savedRoutes: Array<{ id: number; name: string; address: string; lat: string | null; lng: string | null; confirmCount: number | null }>;
  onSuggestion?: (match: SavedRouteMatch | null, movementType: "walking" | "driving") => void;
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

function bearingDiff(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function useMagicGps({ enabled, savedRoutes, onSuggestion }: UseMagicGpsOptions) {
  const [gpsState, setGpsState] = useState<GpsState>({
    speed: null,
    bearing: null,
    lat: null,
    lng: null,
    movementType: null,
    isTracking: false,
    lastUpdate: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const positionHistory = useRef<Array<{ lat: number; lng: number; timestamp: number; speed: number | null }>>([]);
  const lastNotificationTime = useRef<number>(0);
  const lastDeclineTime = useRef<number>(0);
  const stationaryStart = useRef<number | null>(null);
  const consistentDirectionStart = useRef<number | null>(null);
  const lastBearing = useRef<number | null>(null);

  const checkRouteMatch = useCallback((bearing: number, lat: number, lng: number): SavedRouteMatch | null => {
    if (!savedRoutes.length) return null;

    let bestMatch: SavedRouteMatch | null = null;
    let bestScore = 0;

    for (const route of savedRoutes) {
      if (!route.lat || !route.lng) continue;

      const routeLat = parseFloat(route.lat);
      const routeLng = parseFloat(route.lng);
      const routeBearing = calculateBearing(lat, lng, routeLat, routeLng);
      const diff = bearingDiff(bearing, routeBearing);

      if (diff < 45) {
        const directionScore = 1 - (diff / 45);
        const confirmBoost = Math.min((route.confirmCount || 0) * 0.1, 0.5);
        const score = directionScore + confirmBoost;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            routeId: route.id,
            routeName: route.name,
            address: route.address,
            bearing: routeBearing,
            confidence: Math.min(score, 1),
          };
        }
      }
    }

    return bestMatch;
  }, [savedRoutes]);

  const declineSuggestion = useCallback(() => {
    lastDeclineTime.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsState(prev => ({ ...prev, isTracking: false, movementType: null }));
      return;
    }

    const handlePosition = (position: GeolocationPosition) => {
      const { latitude, longitude, speed: rawSpeed } = position.coords;
      const now = Date.now();

      positionHistory.current.push({ lat: latitude, lng: longitude, timestamp: now, speed: rawSpeed });
      if (positionHistory.current.length > 20) positionHistory.current.shift();

      let calculatedSpeed = rawSpeed !== null ? rawSpeed * 2.237 : null;

      if (calculatedSpeed === null && positionHistory.current.length >= 2) {
        const prev = positionHistory.current[positionHistory.current.length - 2];
        const dt = (now - prev.timestamp) / 1000;
        if (dt > 0 && dt < 30) {
          const R = 3959;
          const dLat = (latitude - prev.lat) * Math.PI / 180;
          const dLng = (longitude - prev.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          calculatedSpeed = (dist / dt) * 3600;
        }
      }

      let movementType: "stationary" | "walking" | "driving" | null = null;
      if (calculatedSpeed !== null) {
        if (calculatedSpeed > 8) movementType = "driving";
        else if (calculatedSpeed >= 1 && calculatedSpeed <= 5) movementType = "walking";
        else if (calculatedSpeed < 1) movementType = "stationary";
      }

      let bearing: number | null = null;
      if (positionHistory.current.length >= 2) {
        const prev = positionHistory.current[positionHistory.current.length - 2];
        bearing = calculateBearing(prev.lat, prev.lng, latitude, longitude);
      }

      if (movementType === "stationary") {
        if (!stationaryStart.current) stationaryStart.current = now;
        if (now - stationaryStart.current > 300000) {
          consistentDirectionStart.current = null;
          lastBearing.current = null;
        }
      } else {
        stationaryStart.current = null;
      }

      if (bearing !== null && (movementType === "walking" || movementType === "driving")) {
        if (lastBearing.current !== null && bearingDiff(bearing, lastBearing.current) < 30) {
          if (!consistentDirectionStart.current) consistentDirectionStart.current = now;
        } else {
          consistentDirectionStart.current = now;
        }
        lastBearing.current = bearing;

        const consistentDuration = consistentDirectionStart.current ? (now - consistentDirectionStart.current) / 1000 : 0;

        if (consistentDuration >= 60 && onSuggestion) {
          const timeSinceNotification = now - lastNotificationTime.current;
          const timeSinceDecline = now - lastDeclineTime.current;

          if (timeSinceNotification > 600000 && timeSinceDecline > 900000) {
            const match = checkRouteMatch(bearing, latitude, longitude);
            onSuggestion(match, movementType);
            lastNotificationTime.current = now;
          }
        }
      }

      setGpsState({
        speed: calculatedSpeed,
        bearing,
        lat: latitude,
        lng: longitude,
        movementType,
        isTracking: true,
        lastUpdate: now,
      });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (error) => {
        console.warn("MagicGPS error:", error.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    setGpsState(prev => ({ ...prev, isTracking: true }));

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, checkRouteMatch, onSuggestion]);

  return { gpsState, declineSuggestion };
}
