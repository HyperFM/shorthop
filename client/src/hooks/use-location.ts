import { useState, useEffect, useCallback, useRef } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permitted: boolean;
}

export interface NearbyHopper {
  id: string;
  message: string;
  distance: string;
  direction: string;
  timestamp: number;
}

const HOPPER_MESSAGES = [
  "Hop Hop — a rider is ahead",
  "Someone nearby needs a hop",
  "A Hopper is walking your route",
  "Hop alert — rider spotted nearby",
  "A fellow Hopper is close by",
  "Quick hop opportunity nearby",
];

const DIRECTIONS = ["north", "south", "east", "west", "ahead", "nearby"];

const DISTANCES = ["0.2 mi", "0.3 mi", "0.5 mi", "0.1 mi", "0.4 mi", "0.6 mi"];

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permitted: false,
  });

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
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

export function useNearbyHopperSimulation(enabled: boolean = true) {
  const [currentHopper, setCurrentHopper] = useState<NearbyHopper | null>(null);
  const { showNotification, permission } = useBrowserNotifications();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(() => {
    setCurrentHopper(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const generateHopper = () => {
      const message =
        HOPPER_MESSAGES[Math.floor(Math.random() * HOPPER_MESSAGES.length)];
      const distance =
        DISTANCES[Math.floor(Math.random() * DISTANCES.length)];
      const direction =
        DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

      const hopper: NearbyHopper = {
        id: `hopper-${Date.now()}`,
        message,
        distance,
        direction,
        timestamp: Date.now(),
      };

      setCurrentHopper(hopper);

      if (permission === "granted") {
        showNotification("ShortHop", {
          body: `${message} (${distance} ${direction})`,
        });
      }
    };

    const initialDelay = setTimeout(() => {
      generateHopper();
      timerRef.current = setInterval(generateHopper, 45000 + Math.random() * 30000);
    }, 10000 + Math.random() * 5000);

    return () => {
      clearTimeout(initialDelay);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, permission, showNotification]);

  return { currentHopper, dismiss };
}
