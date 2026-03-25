import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permitted: boolean;
}


export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permitted: false,
  });
  const watchIdRef = useRef<number | null>(null);
  const lastGoodRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        const MAX_ACCURACY = 100;
        if (accuracy > MAX_ACCURACY && lastGoodRef.current) return;

        const prev = lastGoodRef.current;
        if (prev) {
          const dLat = lat - prev.lat;
          const dLng = lng - prev.lng;
          const distMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111_139;
          const dtSec = (Date.now() - prev.time) / 1000;
          const speedMps = dtSec > 0 ? distMeters / dtSec : 0;
          if (speedMps > 67 && distMeters > 50) return;
        }

        lastGoodRef.current = { lat, lng, time: Date.now() };
        setState({
          latitude: lat,
          longitude: lng,
          accuracy,
          error: null,
          loading: false,
          permitted: true,
        });
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          error: err.message,
          loading: false,
          permitted: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...state, requestPermission };
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return;
      try {
        new Notification(title, {
          icon: "/favicon.png",
          ...options,
        });
      } catch {
        // Silent fail if notifications blocked
      }
    },
    [permission]
  );

  return { permission, requestPermission, showNotification };
}


export function useLiveLocationBroadcast(enabled: boolean = false) {
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    const sendLocation = (position: GeolocationPosition) => {
      apiRequest('POST', '/api/location', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }).catch(() => {});
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled]);
}

export interface TrackingData {
  available: boolean;
  distance: number | null;
  direction: string | null;
  partnerRole: string | null;
  updatedAt: number | null;
  partnerLat?: number | null;
  partnerLng?: number | null;
  pickupSide?: string | null;
  hopStatus?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  etaMinutes?: number | null;
}

export function useHopTracking(hopId: number | undefined, enabled: boolean = false) {
  const [tracking, setTracking] = useState<TrackingData>({ available: false, distance: null, direction: null, partnerRole: null, updatedAt: null });

  useEffect(() => {
    if (!enabled || !hopId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/hops/${hopId}/tracking`, { credentials: 'include' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTracking(data);
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [hopId, enabled]);

  return tracking;
}

export interface PickupSpot {
  name: string;
  desc: string;
  distance?: number;
  lat: number;
  lng: number;
  trafficFlow?: string;
  corridorType?: string;
}

export function usePickupGuidance(latitude: number | null, longitude: number | null) {
  const [spots, setSpots] = useState<PickupSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    const key = `${latitude},${longitude}`;
    if (key === fetchedRef.current) return;

    const fetchSpots = async () => {
      setLoading(true);
      try {
        const params = latitude !== null && longitude !== null ? `?lat=${latitude}&lng=${longitude}` : '';
        const res = await fetch(`/api/pickup-guidance${params}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSpots(data.spots);
          fetchedRef.current = key;
        }
      } catch {}
      setLoading(false);
    };
    fetchSpots();
  }, [latitude, longitude]);

  return { spots, loading };
}
