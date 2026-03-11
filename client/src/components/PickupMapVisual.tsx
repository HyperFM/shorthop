import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
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

function createPulsingIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.3;animation:shPulse 1.5s ease-in-out infinite;"></div>
        <div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:10px;font-weight:bold;">${label}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function createSpotIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="width:28px;height:28px;background:hsl(142,60%,45%);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:white;font-size:11px;">★</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export function PickupMapVisual({ spots, hasLocation, userLat, userLng, tracking, driverLat, driverLng }: PickupMapVisualProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = `@keyframes shPulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.6);opacity:0.1}}`;
    document.head.appendChild(styleEl);

    const center: [number, number] = userLat != null && userLng != null ? [userLat, userLng] : LEXINGTON_CENTER;

    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

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
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const hasUser = userLat != null && userLng != null;
    const hasDriver = driverLat != null && driverLng != null;

    if (hasUser) {
      const userIcon = createPulsingIcon('#3B82F6', '🚶');
      L.marker([userLat, userLng], { icon: userIcon })
        .bindPopup('<strong style="color:#3B82F6;">You</strong><br/>Your current location')
        .addTo(group);

      map.setView([userLat, userLng], map.getZoom());
    }

    if (tracking?.available && hasDriver) {
      const driverIcon = createPulsingIcon('#22C55E', '🚗');
      L.marker([driverLat!, driverLng!], { icon: driverIcon })
        .bindPopup('<strong style="color:#22C55E;">Driver</strong><br/>Heading your way')
        .addTo(group);

      if (hasUser) {
        routeLineRef.current = L.polyline(
          [[driverLat!, driverLng!], [userLat!, userLng!]],
          { color: '#3B82F6', weight: 4, opacity: 0.7, dashArray: '10, 8' }
        ).addTo(map);

        const bounds = L.latLngBounds([
          [userLat!, userLng!],
          [driverLat!, driverLng!],
        ]);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    spots.forEach((spot) => {
      const icon = createSpotIcon();
      L.marker([spot.lat, spot.lng], { icon })
        .bindPopup(`<strong style="color:hsl(142,60%,45%);">${spot.name}</strong><br/><span style="font-size:11px;">${spot.desc}</span>`)
        .addTo(group);
    });
  }, [userLat, userLng, spots, tracking?.available, tracking?.distance, driverLat, driverLng]);

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden border border-border/50 shadow-inner"
        data-testid="pickup-map"
        style={{ zIndex: 0, height: '250px', minHeight: '250px' }}
      />

      {!hasLocation && (
        <div className="bg-muted/50 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Allow location access to see your position on the map</p>
        </div>
      )}

      {hasLocation && spots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3"
          data-testid="pickup-guidance-tip"
        >
          <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Walk toward a main road
          </p>
          <p className="text-xs text-muted-foreground">
            Drivers pass through busy roads on their routine commutes. Head to <strong className="text-foreground">{spots[0]?.name}</strong> for the best pickup chances.
          </p>
        </motion.div>
      )}

    </div>
  );
}
