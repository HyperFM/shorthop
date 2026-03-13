import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Navigation, Bookmark, MapPin, Mail, Car, X, Shield, Clock, AlertTriangle, Power } from "lucide-react";
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
type Corridor = { id: number; name: string; description?: string };

const CORRIDORS: Corridor[] = [
  { id: 1, name: "New Circle Rd", description: "Heavy flow" },
  { id: 2, name: "Nicholasville Rd", description: "Peak hours" },
  { id: 3, name: "Richmond Rd", description: "Midday flow" },
  { id: 4, name: "Leestown Rd", description: "West Lex" },
];

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

function MapView({ mode, latitude, longitude, hasMatchedRide }: { mode: HopMode; latitude: number | null; longitude: number | null; hasMatchedRide: boolean }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

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
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
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

    mapRef.current.easeTo({ center: lngLat, duration: 800 });
  }, [latitude, longitude, mode, hasMatchedRide]);

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
    </div>
  );
}

function InstaHopView({ user }: { user: User }) {
  const [, setLocation] = useLocation();
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

  const onSubmit = (data: z.infer<typeof searchSchema>) => {
    if (mode === "walk") {
      showFlash("🚶", "GPS navigation starting...", "info");
      return;
    }
    setIsMatching(true);
    requestHop.mutate({ ...data, hopType: 'short_hop' } as any, {
      onSuccess: () => {
        showFlash("⚡", mode === "drive" ? "Drive started!" : "InstaHop requested!", "success");
      },
      onError: () => {
        setIsMatching(false);
      }
    });
  };

  const nearestCorridors = CORRIDORS.slice(0, 2);

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
        <MapView mode={mode} latitude={geo.latitude} longitude={geo.longitude} hasMatchedRide={!!(activeHop && (activeHop.status === "matched" || activeHop.status === "in_ride"))} />

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
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {nearestCorridors.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          form.setValue("startLocation", c.name);
                          showFlash("📍", `${c.name}`, "info");
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-700/30 text-left hover:border-orange-400/60 transition-all"
                        data-testid={`button-corridor-${c.id}`}
                      >
                        <MapPin className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                        <span className="text-[9px] font-black text-foreground leading-none">{c.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex-1">
                    <AnimatePresence>
                      {greetingVisible && (
                        <motion.p
                          key="greeting"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[11px] font-semibold text-foreground/60 text-center mb-1"
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

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500" />
                      <Input
                        placeholder="Current location"
                        className="h-11 text-sm rounded-xl bg-muted/40 border-border/50 pl-9 focus:bg-background"
                        data-testid="input-instahop-start"
                        {...form.register("startLocation")}
                      />
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
