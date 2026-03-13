import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Car, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useHops, useRequestHop } from "@/hooks/use-hops";
import { useGeolocation } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { WelcomeGlobe, hasSeenWelcomeGlobe } from "@/components/WelcomeGlobe";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/routes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const searchSchema = z.object({
  startLocation: z.string().min(2, "Required"),
  endLocation: z.string().min(2, "Required"),
});

type WalkerRouteData = { id: number; name: string; startLocation: string; endLocation: string };

const CORRIDORS = [
  { id: 1, name: "New Circle Rd", description: "Heavy flow · all day" },
  { id: 2, name: "Nicholasville Rd", description: "Peak morning & evening" },
  { id: 3, name: "Richmond Rd", description: "Steady midday flow" },
  { id: 4, name: "Leestown Rd", description: "West Lex connector" },
];

const LEX_CENTER: [number, number] = [37.9896, -84.4773];
const TAB_H = 64;

const MAP_ANIM_CSS = `
@keyframes shHopperPulse{0%,100%{transform:scale(1);opacity:0.45}50%{transform:scale(1.7);opacity:0.1}}
@keyframes shHopperRing{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.4);opacity:0}}
`;

function createHopperIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(59,130,246,0.18);animation:shHopperPulse 2s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(59,130,246,0.35);animation:shHopperRing 2s ease-out infinite;"></div>
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(145deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px white,0 4px 14px rgba(59,130,246,0.55);">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="4" r="2.2"/>
            <path d="M9 8.5 C9 8.5 10 10 12 10 C14 10 15 8.5 15 8.5 L14 14 L16 20 L14 20 L12.5 15.5 L11 20 L9 20 L11 14 Z" fill="white"/>
            <path d="M9 8.5 L7 12" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <path d="M15 8.5 L17 11" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function InstaHopMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const styleEl = document.createElement("style");
    styleEl.textContent = MAP_ANIM_CSS;
    document.head.appendChild(styleEl);

    const map = L.map(mapRef.current, {
      center: LEX_CENTER,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.marker(LEX_CENTER, { icon: createHopperIcon() }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      document.head.removeChild(styleEl);
    };
  }, []);

  return <div ref={mapRef} className="absolute inset-0" />;
}

function StatsCarousel({ user }: { user: User }) {
  const stats = [
    { emoji: "🔥", value: user.hopStreak || 0, label: "streak", testId: "text-streak-count" },
    { emoji: "⭐", value: user.totalHops || 0, label: "hops", testId: "text-total-hops-count" },
    { emoji: "🛞", value: user.credits || 0, label: "wheels", testId: "text-wheels-count" },
  ];

  return (
    <div
      className="flex items-center rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.93)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 18px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.7)",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center px-3 py-2 relative"
        >
          <span className="text-base leading-none">{s.emoji}</span>
          <span
            className="text-[13px] font-black leading-none text-gray-800 mt-0.5"
            data-testid={s.testId}
          >
            {s.value}
          </span>
          <span className="text-[8px] font-semibold text-gray-400 mt-0.5">{s.label}</span>
          {i < stats.length - 1 && (
            <div
              className="absolute right-0 top-1/4 bottom-1/4 w-px"
              style={{ background: "rgba(0,0,0,0.09)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function InstaHopView({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const [payWithWheels, setPayWithWheels] = useState(false);
  const geo = useGeolocation();
  const [showGlobe, setShowGlobe] = useState(() => !hasSeenWelcomeGlobe());
  const [greetingVisible, setGreetingVisible] = useState(() => hasSeenWelcomeGlobe());

  const activeHop = hops?.find(
    (h) => h.status !== "completed" && h.status !== "cancelled"
  );

  const { data: savedRoutes } = useQuery<WalkerRouteData[]>({
    queryKey: ["/api/walker-routes"],
  });

  const { data: networkStats } = useQuery<{
    totalUsers: number;
    totalDrivers: number;
    totalHoppers: number;
    activeDrivers: number;
  }>({
    queryKey: ["/api/network-stats"],
  });

  const driversInCity = networkStats?.activeDrivers ?? 0;
  const nearestCorridors = CORRIDORS.slice(0, 2);

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { startLocation: "", endLocation: "" },
  });

  useEffect(() => {
    if (!geo.permitted) geo.requestPermission();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const route = params.get("route");
    if (route) {
      const parts = route.split(" → ");
      if (parts.length === 2) {
        form.setValue("startLocation", parts[0]);
        form.setValue("endLocation", parts[1]);
      }
      window.history.replaceState({}, "", "/instahop");
    }
  }, []);

  const onSubmit = (data: z.infer<typeof searchSchema>) => {
    requestHop.mutate({ ...data, hopType: "short_hop", payWithWheels } as any, {
      onSuccess: () => {
        setPayWithWheels(false);
        showFlash("⚡", "InstaHop requested!", "success");
      },
    });
  };

  if (activeHop) {
    setLocation("/dashboard");
    return null;
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

      {/* Full-screen map */}
      <div
        className="fixed left-0 right-0 top-0 z-0"
        style={{ bottom: TAB_H }}
      >
        <InstaHopMap />

        {/* Corridor tags — bottom left, floating on map */}
        <div className="absolute left-3 bottom-3 z-10 flex flex-col gap-1.5">
          {nearestCorridors.map((c) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + c.id * 0.07 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                form.setValue("startLocation", c.name);
                showFlash("📍", `${c.name} selected`, "info");
              }}
              className="flex flex-col items-start text-left"
              style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(14px)",
                borderRadius: 12,
                padding: "6px 10px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.6)",
              }}
              data-testid={`button-corridor-${c.id}`}
            >
              <span className="text-[10px] font-black text-gray-800 leading-tight">{c.name}</span>
              <span className="text-[8.5px] text-gray-400 leading-tight mt-0.5">{c.description}</span>
            </motion.button>
          ))}
        </div>

        {/* Stats carousel — bottom right, above panel */}
        <div className="absolute right-3 bottom-3 z-10">
          <StatsCarousel user={user} />
        </div>
      </div>

      {/* Bottom panel */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="fixed left-0 right-0 z-20"
        style={{
          bottom: TAB_H,
          background: "var(--background)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.14)",
        }}
      >
        {/* Drag pill */}
        <div className="flex justify-center pt-2.5 pb-0.5">
          <div
            className="w-9 h-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.12)" }}
          />
        </div>

        <div className="px-4 pt-1.5 pb-3 space-y-2">
          {/* Greeting */}
          <AnimatePresence>
            {greetingVisible && (
              <motion.p
                key="greeting"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-semibold text-muted-foreground text-center"
                data-testid="text-instahop-greeting"
              >
                happy hopping,{" "}
                <span className="text-foreground font-black">{user.username}</span>
              </motion.p>
            )}
          </AnimatePresence>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            {/* Current location */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-400/50" />
              <Input
                placeholder="Current location"
                className="h-11 text-sm rounded-2xl bg-muted/50 border-border/40 pl-8 focus:bg-background"
                data-testid="input-instahop-start"
                {...form.register("startLocation")}
              />
            </div>

            {/* Destination */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
                  <circle cx="5.5" cy="5.5" r="1.8" fill="currentColor" className="text-muted-foreground" />
                </svg>
              </div>
              <Input
                placeholder="Where to?"
                className="h-11 text-sm rounded-2xl bg-muted/50 border-border/40 pl-8 font-semibold focus:bg-background"
                data-testid="input-instahop-destination"
                {...form.register("endLocation")}
              />
            </div>

            {/* Saved routes quick-select */}
            {savedRoutes && savedRoutes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {savedRoutes.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      form.setValue("startLocation", r.startLocation);
                      form.setValue("endLocation", r.endLocation);
                    }}
                    className="h-6 text-[10px] font-bold rounded-full px-2.5 border border-primary/25 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                    data-testid={`button-instahop-route-${r.id}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}

            {/* InstaHop button */}
            <motion.button
              type="submit"
              disabled={requestHop.isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black text-[17px] flex items-center justify-center gap-2.5 shadow-lg shadow-green-500/30 transition-all disabled:opacity-60"
              data-testid="button-instahop"
              style={{ letterSpacing: "-0.01em" }}
            >
              <Zap className="w-5 h-5 stroke-[2.5]" />
              {requestHop.isPending ? "Finding..." : "InstaHop"}
            </motion.button>

            {/* Wheels payment toggle */}
            {(user.credits || 0) > 0 && (
              <button
                type="button"
                onClick={() => setPayWithWheels(!payWithWheels)}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  payWithWheels
                    ? "bg-secondary/15 text-secondary border border-secondary/35"
                    : "bg-muted/30 text-muted-foreground border border-transparent hover:border-secondary/25"
                }`}
                data-testid="toggle-instahop-wheels"
              >
                <span>🛞</span>
                {payWithWheels
                  ? `Paying with Wheels (${user.credits} available)`
                  : `Pay with Wheels (${user.credits} 🛞)`}
              </button>
            )}
          </form>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <div className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              <span>
                {driversInCity > 0
                  ? `${driversInCity} driver${driversInCity !== 1 ? "s" : ""} active nearby`
                  : "Drivers coming soon"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{networkStats?.totalHoppers || 0} hoppers nearby</span>
            </div>
          </div>
        </div>
      </motion.div>
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
