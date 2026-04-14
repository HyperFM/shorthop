import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Locate } from "lucide-react";
import type { PickupSpot, TrackingData } from "@/hooks/use-location";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PickupMapVisualProps {
  spots: PickupSpot[];
  hasLocation: boolean;
  userLat?: number | null;
  userLng?: number | null;
  tracking?: TrackingData;
  driverLat?: number | null;
  driverLng?: number | null;
}

const LEXINGTON_CENTER: [number, number] = [38.0406, -84.5037];

const MAP_STYLES = `
@keyframes shPulse{0%,100%{transform:scale(1);opacity:0.35}50%{transform:scale(1.8);opacity:0.08}}
@keyframes shRipple{0%{transform:scale(1);opacity:0.4}100%{transform:scale(2.5);opacity:0}}
@keyframes shDash{to{stroke-dashoffset:-40}}
@keyframes shGlow{0%,100%{filter:drop-shadow(0 0 6px rgba(59,130,246,0.5))}50%{filter:drop-shadow(0 0 14px rgba(59,130,246,0.8))}}
.sh-route-animated{animation:shGlow 2s ease-in-out infinite}
`;

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#3B82F6;opacity:0.3;animation:shPulse 2s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:#3B82F6;opacity:0.15;animation:shRipple 2.5s ease-out infinite;"></div>
        <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#2563EB);border:3px solid white;box-shadow:0 2px 12px rgba(59,130,246,0.5);display:flex;align-items:center;justify-content:center;">
          <div style="width:8px;height:8px;border-radius:50%;background:white;"></div>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function createDriverIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#22C55E;opacity:0.25;animation:shPulse 1.8s ease-in-out infinite;"></div>
        <div style="width:32px;height:32px;border-radius:12px;background:linear-gradient(135deg,#22C55E,#16A34A);border:3px solid white;box-shadow:0 3px 12px rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center;transform:rotate(0deg);">
          <span style="font-size:16px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">🚗</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function createSpotIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:32px;height:38px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,hsl(142,60%,45%),hsl(142,70%,35%));border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:bold;">★</span>
        </div>
        <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:16px;height:4px;background:rgba(0,0,0,0.15);border-radius:50%;filter:blur(1px);"></div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
}

function createAnimatedRoute(map: L.Map, from: [number, number], to: [number, number]): L.LayerGroup {
  const group = L.layerGroup();

  const glowLine = L.polyline([from, to], {
    color: '#3B82F6',
    weight: 8,
    opacity: 0.15,
    lineCap: 'round',
  });
  glowLine.addTo(group);

  const mainLine = L.polyline([from, to], {
    color: '#3B82F6',
    weight: 4,
    opacity: 0.8,
    lineCap: 'round',
    lineJoin: 'round',
  });
  mainLine.addTo(group);

  const dashLine = L.polyline([from, to], {
    color: '#60A5FA',
    weight: 3,
    opacity: 0.6,
    dashArray: '12, 16',
    lineCap: 'round',
  });
  dashLine.addTo(group);

  const el = dashLine.getElement() as HTMLElement | null;
  if (el) el.style.animation = 'shDash 1.5s linear infinite';

  const midLat = (from[0] + to[0]) / 2;
  const midLng = (from[1] + to[1]) / 2;
  const angle = Math.atan2(to[0] - from[0], to[1] - from[1]) * (180 / Math.PI);

  const arrowIcon = L.divIcon({
    className: '',
    html: `
      <div style="transform:rotate(${-angle + 90}deg);display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M12 6l4 4-4 4" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(group);

  const q1Lat = (from[0] + midLat) / 2;
  const q1Lng = (from[1] + midLng) / 2;
  const q3Lat = (to[0] + midLat) / 2;
  const q3Lng = (to[1] + midLng) / 2;

  [{ lat: q1Lat, lng: q1Lng }, { lat: q3Lat, lng: q3Lng }].forEach(p => {
    const smallArrow = L.divIcon({
      className: '',
      html: `
        <div style="transform:rotate(${-angle + 90}deg);opacity:0.5;display:flex;align-items:center;justify-content:center;width:16px;height:16px;">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <path d="M6 10h8M11 7l3 3-3 3" stroke="#60A5FA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([p.lat, p.lng], { icon: smallArrow, interactive: false }).addTo(group);
  });

  group.addTo(map);
  return group;
}

export function PickupMapVisual({ spots, hasLocation, userLat, userLng, tracking, driverLat, driverLng }: PickupMapVisualProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = MAP_STYLES;
    document.head.appendChild(styleEl);

    const center: [number, number] = userLat != null && userLng != null ? [userLat, userLng] : LEXINGTON_CENTER;

    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: '' }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 500);

    return () => {
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
    if (routeGroupRef.current) {
      routeGroupRef.current.remove();
      routeGroupRef.current = null;
    }

    const hasUser = userLat != null && userLng != null;
    const hasDriver = driverLat != null && driverLng != null;

    if (hasUser) {
      L.marker([userLat, userLng], { icon: createUserIcon() })
        .bindPopup(`
          <div style="text-align:center;padding:4px;">
            <div style="font-weight:700;color:#3B82F6;font-size:13px;">You</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">Current location</div>
          </div>
        `)
        .addTo(group);

      map.setView([userLat, userLng], map.getZoom());
    }

    if (tracking?.available && hasDriver) {
      L.marker([driverLat!, driverLng!], { icon: createDriverIcon() })
        .bindPopup(`
          <div style="text-align:center;padding:4px;">
            <div style="font-weight:700;color:#22C55E;font-size:13px;">Your Driver</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">${tracking.distance ? tracking.distance.toFixed(1) + ' mi away' : 'On the way'}</div>
          </div>
        `)
        .addTo(group);

      if (hasUser) {
        routeGroupRef.current = createAnimatedRoute(
          map,
          [driverLat!, driverLng!],
          [userLat!, userLng!]
        );

        const bounds = L.latLngBounds([
          [userLat!, userLng!],
          [driverLat!, driverLng!],
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    spots.forEach((spot) => {
      L.marker([spot.lat, spot.lng], { icon: createSpotIcon() })
        .bindPopup(`
          <div style="padding:4px;">
            <div style="font-weight:700;color:hsl(142,60%,45%);font-size:13px;">${spot.name}</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">${spot.desc}</div>
          </div>
        `)
        .addTo(group);
    });
  }, [userLat, userLng, spots, tracking?.available, tracking?.distance, driverLat, driverLng]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full rounded-2xl overflow-hidden border-2 border-border/30 shadow-lg"
          data-testid="pickup-map"
          style={{ zIndex: 0, height: '280px', minHeight: '280px' }}
        />
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background/40 to-transparent rounded-t-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/40 to-transparent rounded-b-2xl pointer-events-none" />

        {tracking?.available && tracking.distance && tracking.distance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg"
            data-testid="distance-badge"
          >
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-white" />
              <p className="text-sm font-extrabold text-white">{tracking.distance.toFixed(1)} mi</p>
            </div>
          </motion.div>
        )}
      </div>

      {!hasLocation && (
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl px-4 py-3 text-center border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center gap-2">
            <Locate className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Enable location to see yourself on the map</p>
          </div>
        </div>
      )}

      {hasLocation && spots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/5 to-blue-500/5 border border-primary/20 rounded-xl px-4 py-3"
          data-testid="pickup-guidance-tip"
        >
          <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Walk toward a main road
          </p>
          <p className="text-xs text-muted-foreground">
            Drivers pass through busy roads on their commutes. Head to <strong className="text-foreground">{spots[0]?.name}</strong> for the best pickup chances.
          </p>
        </motion.div>
      )}
    </div>
  );
}
