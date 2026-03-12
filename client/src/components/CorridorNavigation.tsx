import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Navigation, MapPin, Clock, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PickupSpot, TrackingData } from "@/hooks/use-location";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import hopperIconPath from "@assets/Bazaart_9CBD9453-5426-403A-86B2-695880EF24E1_1773310252698.jpeg";
import driverCarIconPath from "@assets/Bazaart_9CBD9453-5426-403A-86B2-695880EF24E1_1773310264943.jpeg";
import rideActiveIconPath from "@assets/Bazaart_9CBD9453-5426-403A-86B2-695880EF24E1_1773310252697.jpeg";

type RideState = "walking" | "driver_approaching" | "ride_active";

interface CorridorNavigationProps {
  spot: PickupSpot;
  userLat: number;
  userLng: number;
  tracking?: TrackingData;
  driverLat?: number | null;
  driverLng?: number | null;
  hopStatus?: string;
  onBack: () => void;
}

const MAP_STYLES = `
@keyframes cnPulse{0%,100%{transform:scale(1);opacity:0.35}50%{transform:scale(1.8);opacity:0.08}}
@keyframes cnDash{to{stroke-dashoffset:-40}}
@keyframes cnBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
`;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateWalkTime(miles: number): number {
  return Math.max(1, Math.round(miles / 0.05));
}

function createHopperMapIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#3B82F6;opacity:0.25;animation:cnPulse 2s ease-in-out infinite;"></div>
        <div style="width:40px;height:40px;border-radius:50%;background:white;border:3px solid #3B82F6;box-shadow:0 3px 12px rgba(59,130,246,0.4);display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${hopperIconPath}" style="width:30px;height:30px;object-fit:contain;" />
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

function createDriverMapIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#22C55E;opacity:0.2;animation:cnPulse 1.8s ease-in-out infinite;"></div>
        <div style="width:44px;height:44px;border-radius:14px;background:white;border:3px solid #22C55E;box-shadow:0 3px 14px rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${driverCarIconPath}" style="width:34px;height:34px;object-fit:contain;" />
        </div>
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });
}

function createRideActiveMapIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#22C55E;opacity:0.2;animation:cnPulse 2s ease-in-out infinite;"></div>
        <div style="width:50px;height:50px;border-radius:16px;background:white;border:3px solid #22C55E;box-shadow:0 4px 16px rgba(34,197,94,0.5);display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${rideActiveIconPath}" style="width:40px;height:40px;object-fit:contain;" />
        </div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  });
}

function createCorridorIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:42px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#F97316,#EA580C);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 12px rgba(249,115,22,0.4);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);color:white;font-size:15px;font-weight:bold;">📍</span>
        </div>
        <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:18px;height:4px;background:rgba(0,0,0,0.15);border-radius:50%;filter:blur(1px);"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
  });
}

export function CorridorNavigation({ spot, userLat, userLng, tracking, driverLat, driverLng, hopStatus, onBack }: CorridorNavigationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const [rideState, setRideState] = useState<RideState>("walking");

  const distToSpot = haversineDistance(userLat, userLng, spot.lat, spot.lng);
  const walkTime = estimateWalkTime(distToSpot);

  const driverDist = (driverLat != null && driverLng != null)
    ? haversineDistance(userLat, userLng, driverLat, driverLng)
    : null;
  const driverEta = driverDist ? Math.max(1, Math.round(driverDist / 0.5)) : null;

  useEffect(() => {
    if (hopStatus === "matched" && driverLat != null && driverLng != null) {
      setRideState("driver_approaching");
    } else if (hopStatus === "in_progress" || hopStatus === "completed") {
      setRideState("ride_active");
    } else {
      setRideState("walking");
    }
  }, [hopStatus, driverLat, driverLng]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = MAP_STYLES;
    document.head.appendChild(styleEl);

    const map = L.map(mapRef.current, {
      center: [userLat, userLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = null;
      styleEl.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return;
    const map = mapInstanceRef.current;
    const group = markersRef.current;
    group.clearLayers();
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }

    const routeGroup = L.layerGroup().addTo(map);
    routeRef.current = routeGroup;

    if (rideState === "walking") {
      L.marker([userLat, userLng], { icon: createHopperMapIcon() }).addTo(group);
      L.marker([spot.lat, spot.lng], { icon: createCorridorIcon() }).addTo(group);

      const walkLine = L.polyline([[userLat, userLng], [spot.lat, spot.lng]], {
        color: '#3B82F6',
        weight: 5,
        opacity: 0.7,
        dashArray: '10, 8',
        lineCap: 'round',
      }).addTo(routeGroup);

      const el = walkLine.getElement() as HTMLElement | null;
      if (el) el.style.animation = 'cnDash 1.5s linear infinite';

      L.polyline([[userLat, userLng], [spot.lat, spot.lng]], {
        color: '#3B82F6',
        weight: 10,
        opacity: 0.12,
        lineCap: 'round',
      }).addTo(routeGroup);

      map.fitBounds([[userLat, userLng], [spot.lat, spot.lng]], { padding: [60, 60] });

    } else if (rideState === "driver_approaching") {
      L.marker([userLat, userLng], { icon: createHopperMapIcon() }).addTo(group);
      if (driverLat != null && driverLng != null) {
        L.marker([driverLat, driverLng], { icon: createDriverMapIcon() }).addTo(group);

        L.polyline([[driverLat, driverLng], [userLat, userLng]], {
          color: '#22C55E',
          weight: 5,
          opacity: 0.7,
          dashArray: '10, 8',
          lineCap: 'round',
        }).addTo(routeGroup);

        L.polyline([[driverLat, driverLng], [userLat, userLng]], {
          color: '#22C55E',
          weight: 10,
          opacity: 0.12,
          lineCap: 'round',
        }).addTo(routeGroup);

        const bounds = L.latLngBounds([[userLat, userLng], [driverLat, driverLng]]);
        map.fitBounds(bounds, { padding: [60, 60] });
      }

    } else if (rideState === "ride_active") {
      const rideLat = driverLat ?? userLat;
      const rideLng = driverLng ?? userLng;
      L.marker([rideLat, rideLng], { icon: createRideActiveMapIcon() }).addTo(group);

      if (spot.lat && spot.lng) {
        L.marker([spot.lat, spot.lng], { icon: createCorridorIcon() }).addTo(group);

        L.polyline([[rideLat, rideLng], [spot.lat, spot.lng]], {
          color: '#22C55E',
          weight: 6,
          opacity: 0.8,
          lineCap: 'round',
        }).addTo(routeGroup);

        map.fitBounds([[rideLat, rideLng], [spot.lat, spot.lng]], { padding: [60, 60] });
      } else {
        map.setView([rideLat, rideLng], 15);
      }
    }
  }, [userLat, userLng, driverLat, driverLng, spot, rideState]);

  const stateConfig = {
    walking: {
      color: "bg-blue-500",
      label: "Walking to Pickup",
      icon: hopperIconPath,
    },
    driver_approaching: {
      color: "bg-green-500",
      label: "Driver Approaching",
      icon: driverCarIconPath,
    },
    ride_active: {
      color: "bg-green-600",
      label: "Ride in Progress",
      icon: rideActiveIconPath,
    },
  };

  const config = stateConfig[rideState];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="corridor-navigation">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-lg">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 rounded-full" data-testid="button-nav-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate" data-testid="text-corridor-name">{spot.name}</p>
          <p className="text-xs text-muted-foreground">{spot.desc}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full ${config.color} text-white text-xs font-bold`} data-testid="badge-ride-state">
          {config.label}
        </div>
      </div>

      <div className="flex-1 relative">
        <div
          ref={mapRef}
          className="w-full h-full"
          data-testid="corridor-nav-map"
          style={{ zIndex: 0 }}
        />

        <AnimatePresence mode="wait">
          {rideState === "walking" && (
            <motion.div
              key="walking-msg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <Card className="border-blue-200/50 bg-background/95 backdrop-blur-md shadow-xl rounded-2xl" data-testid="card-walking-guidance">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center overflow-hidden">
                      <img src={hopperIconPath} alt="Hopper" className="w-9 h-9 object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground" data-testid="text-walk-instruction">Walk toward the pickup corridor</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{spot.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Footprints className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-foreground">{distToSpot.toFixed(2)} mi away</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-foreground">~{walkTime} min walk</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {rideState === "driver_approaching" && (
            <motion.div
              key="driver-msg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <Card className="border-green-200/50 bg-background/95 backdrop-blur-md shadow-xl rounded-2xl" data-testid="card-driver-approaching">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 border-2 border-green-200 flex items-center justify-center overflow-hidden">
                      <img src={driverCarIconPath} alt="Driver" className="w-9 h-9 object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">Driver on the way</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Stay at the pickup corridor</p>
                    </div>
                    <motion.div
                      className="w-3 h-3 rounded-full bg-green-500"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-foreground">
                        {driverDist ? `${driverDist.toFixed(1)} mi away` : 'Calculating...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-foreground">
                        {driverEta ? `~${driverEta} min ETA` : 'Arriving soon'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {rideState === "ride_active" && (
            <motion.div
              key="ride-msg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <Card className="border-green-300/50 bg-background/95 backdrop-blur-md shadow-xl rounded-2xl" data-testid="card-ride-active">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-green-50 border-2 border-green-300 flex items-center justify-center overflow-hidden">
                      <img src={rideActiveIconPath} alt="Ride active" className="w-11 h-11 object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">Ride in progress</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Live GPS tracking active</p>
                      {tracking?.distance != null && (
                        <p className="text-xs font-medium text-foreground mt-1">
                          {tracking.distance < 0.1 ? 'Arriving at destination...' : `${tracking.distance.toFixed(1)} mi remaining`}
                        </p>
                      )}
                    </div>
                    <motion.div
                      className="flex flex-col items-center gap-1"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] text-green-600 font-bold">LIVE</span>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
