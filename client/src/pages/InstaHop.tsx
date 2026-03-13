import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Navigation, Bookmark, MapPin, Mail, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHops, useRequestHop } from "@/hooks/use-hops";
import { useGeolocation } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { WelcomeGlobe, hasSeenWelcomeGlobe } from "@/components/WelcomeGlobe";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/routes";
import carIconUrl from "@assets/Bazaart_9CBD9453-5426-403A-86B2-695880EF24E1_1773378532833.jpeg";
import walkerIconUrl from "@assets/Bazaart_9CBD9453-5426-403A-86B2-695880EF24E1_1773378565668.jpeg";

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

function MapView({ mode, destination }: { mode: HopMode; destination: string }) {
  const hopperDots = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    top: 15 + Math.random() * 55,
    left: 20 + Math.random() * 60,
  }));

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-green-50/80 via-green-100/40 to-green-50/60 dark:from-green-950/30 dark:via-green-900/15 dark:to-green-950/20" data-testid="map-view">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
          linear-gradient(180deg, rgba(0,0,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      <div className="absolute top-[20%] left-[15%] right-[15%] h-[2px]">
        <div className="w-full h-full bg-gray-300/60 dark:bg-gray-600/40 rounded" />
      </div>
      <div className="absolute top-[40%] left-[10%] right-[20%] h-[2px]">
        <div className="w-full h-full bg-gray-300/60 dark:bg-gray-600/40 rounded" />
      </div>
      <div className="absolute top-[60%] left-[5%] right-[10%] h-[2px]">
        <div className="w-full h-full bg-gray-300/60 dark:bg-gray-600/40 rounded" />
      </div>
      <div className="absolute left-[30%] top-[10%] bottom-[40%] w-[2px]">
        <div className="w-full h-full bg-gray-300/60 dark:bg-gray-600/40 rounded" />
      </div>
      <div className="absolute left-[60%] top-[15%] bottom-[35%] w-[2px]">
        <div className="w-full h-full bg-gray-300/60 dark:bg-gray-600/40 rounded" />
      </div>

      {mode !== "drive" && (
        <>
          <motion.div
            className="absolute left-[28%] top-[18%] right-[18%] h-[6px] rounded-full overflow-hidden"
            style={{ background: "linear-gradient(90deg, rgba(34,197,94,0.6), rgba(34,197,94,0.3), rgba(34,197,94,0.6))" }}
          >
            <motion.div
              className="h-full w-8 rounded-full bg-green-400/80"
              animate={{ x: [0, 200, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
          <motion.div
            className="absolute left-[8%] top-[38%] right-[22%] h-[6px] rounded-full overflow-hidden"
            style={{ background: "linear-gradient(90deg, rgba(34,197,94,0.5), rgba(34,197,94,0.2), rgba(34,197,94,0.5))" }}
          >
            <motion.div
              className="h-full w-8 rounded-full bg-green-400/80"
              animate={{ x: [0, 180, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </>
      )}

      {mode === "drive" && hopperDots.map(dot => (
        <motion.div
          key={dot.id}
          className="absolute w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40"
          style={{ top: `${dot.top}%`, left: `${dot.left}%` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2 + dot.id * 0.3, repeat: Infinity }}
        />
      ))}

      <div className="absolute top-[30%] left-1/2 -translate-x-1/2">
        {mode === "walk" ? (
          <motion.div
            className="relative"
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="absolute inset-0 rounded-full blur-lg bg-blue-400/40 scale-150" />
            <img src={walkerIconUrl} alt="Walking" className="w-12 h-12 relative z-10 drop-shadow-lg" />
          </motion.div>
        ) : mode === "drive" ? (
          <motion.div
            className="relative"
            animate={{ y: [-1, 1, -1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img src={carIconUrl} alt="Driving" className="w-14 h-14 drop-shadow-lg" />
          </motion.div>
        ) : (
          <motion.div
            className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {destination && (
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-border/30">
          <p className="text-lg font-black text-foreground text-center">{destination}</p>
        </div>
      )}

      {destination && (
        <div className="absolute bottom-[46%] left-1/2 -translate-x-1/2 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-full px-3 py-1 shadow border border-green-300/50">
          <p className="text-[11px] font-bold text-green-600">1 Wheel = $1</p>
        </div>
      )}
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

function InstaHopView({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const geo = useGeolocation();
  const [showGlobe, setShowGlobe] = useState(() => !hasSeenWelcomeGlobe());
  const [greetingVisible, setGreetingVisible] = useState(() => hasSeenWelcomeGlobe());
  const [mode, setMode] = useState<HopMode>(() => {
    try {
      return localStorage.getItem("sh-active-tab") === "driver" ? "drive" : "hop";
    } catch { return "hop"; }
  });
  const [panelExpanded, setPanelExpanded] = useState(false);

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
    requestHop.mutate({ ...data, hopType: 'short_hop' } as any, {
      onSuccess: () => {
        showFlash("⚡", mode === "drive" ? "Drive started!" : "InstaHop requested!", "success");
      }
    });
  };

  if (activeHop) {
    setLocation("/dashboard");
    return null;
  }

  const cycleMode = () => {
    if (mode === "hop") setMode("walk");
    else if (mode === "walk") setMode("drive");
    else setMode("hop");
  };

  const nearestCorridors = CORRIDORS.slice(0, 2);

  const buttonConfig = {
    hop: { label: "InstaHop", color: "from-green-500 to-green-600", shadow: "shadow-green-500/25", icon: <Zap className="w-5 h-5" /> },
    walk: { label: "Walk", color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/25", icon: <Navigation className="w-5 h-5" /> },
    drive: { label: "Drive Now", color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/25", icon: <Car className="w-5 h-5" /> },
  };

  const currentButton = buttonConfig[mode];

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

      <div className="relative flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
        <MapView mode={mode} destination={destination} />

        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-background/97 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-border/30 z-20"
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          style={{ maxHeight: panelExpanded ? "55%" : "45%" }}
          data-testid="control-panel"
        >
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={() => setPanelExpanded(!panelExpanded)}
              className="w-10 h-1 rounded-full bg-border/60"
              data-testid="panel-handle"
            />
          </div>

          <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: "calc(100% - 20px)" }}>
            <AnimatePresence>
              {greetingVisible && (
                <motion.p
                  key="greeting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] font-semibold text-foreground/60 text-center mb-2"
                  data-testid="text-instahop-greeting"
                >
                  happy hopping,{" "}
                  <span className="text-foreground font-black">{user.username}</span>
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
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
                {mode !== "drive" && (
                  <div className="flex-shrink-0">
                    <div className="flex flex-col gap-1.5">
                      {nearestCorridors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            form.setValue("startLocation", c.name);
                            showFlash("📍", `${c.name}`, "info");
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-700/30 text-left hover:border-orange-400/60 transition-all"
                          data-testid={`button-corridor-${c.id}`}
                        >
                          <MapPin className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                          <div>
                            <span className="text-[10px] font-black text-foreground leading-none block">{c.name}</span>
                            <span className="text-[8px] text-muted-foreground leading-none">{c.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1" />

                <GlowingCarousel user={user} />
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  type="submit"
                  disabled={requestHop.isPending}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 h-14 rounded-2xl bg-gradient-to-r ${currentButton.color} text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl ${currentButton.shadow} transition-all disabled:opacity-60`}
                  data-testid="button-instahop"
                >
                  {currentButton.icon}
                  {requestHop.isPending ? 'Finding...' : currentButton.label}
                </motion.button>

                <button
                  type="button"
                  onClick={cycleMode}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    mode === "walk"
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                      : mode === "drive"
                      ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30"
                      : "border-green-400 bg-green-50 dark:bg-green-950/30"
                  }`}
                  data-testid="button-mode-toggle"
                >
                  {mode === "walk" ? (
                    <motion.img
                      src={walkerIconUrl}
                      alt="Walk"
                      className="w-8 h-8"
                      animate={{ y: [-1, 1, -1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : mode === "drive" ? (
                    <motion.img
                      src={carIconUrl}
                      alt="Drive"
                      className="w-8 h-8"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  ) : (
                    <Zap className="w-6 h-6 text-green-500" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  <span>{driversInCity > 0 ? `${driversInCity} driver${driversInCity !== 1 ? 's' : ''} active nearby` : 'Connecting drivers...'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3 h-3" />
                  <span>{hoppersNearby} hoppers nearby</span>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
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
