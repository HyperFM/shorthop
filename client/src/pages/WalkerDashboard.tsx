import { useState, useEffect, useRef } from "react";
import { SeasonalGreeting } from "@/components/SeasonalGreeting";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Clock, Share2, Flame, Award, Star, Lock, Compass, Users, Car, Radio, ChevronRight, X, Plus, Route, Bookmark, Smartphone, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHops, useRequestHop, useCancelHop } from "@/hooks/use-hops";
import { NetworkProgress } from "@/components/NetworkProgress";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { FounderChat } from "@/components/FounderChat";
import { useGeolocation, useLiveLocationBroadcast, useHopTracking, usePickupGuidance } from "@/hooks/use-location";
import { PickupMapVisual } from "@/components/PickupMapVisual";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import type { User } from "@shared/routes";

type DriverInfo = {
  username: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  licensePlate: string | null;
};

const searchSchema = z.object({
  startLocation: z.string().min(2, "Required"),
  endLocation: z.string().min(2, "Required"),
});

function getBadgeStyle(badge: string): { icon: typeof Flame; color: string } {
  if (badge.includes("100")) return { icon: Award, color: "text-red-600" };
  if (badge.includes("50")) return { icon: Flame, color: "text-red-500" };
  if (badge.includes("25")) return { icon: Flame, color: "text-orange-600" };
  if (badge.includes("10")) return { icon: Flame, color: "text-orange-500" };
  if (badge.includes("3")) return { icon: Star, color: "text-yellow-500" };
  if (badge.includes("Founding")) return { icon: Award, color: "text-green-500" };
  return { icon: Award, color: "text-blue-500" };
}

type WalkerRouteData = { id: number; name: string; startLocation: string; endLocation: string };

export default function WalkerDashboard({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const cancelHop = useCancelHop();
  const [showOptions, setShowOptions] = useState(false);
  const [locations, setLocations] = useState({ startLocation: "", endLocation: "" });
  const [subscriptionPlan, setSubscriptionPlan] = useState<"flex_hop" | "power_hop" | null>(null);
  const [streakOpen, setStreakOpen] = useState(false);
  const [hopsOpen, setHopsOpen] = useState(false);
  const [savedRoutesOpen, setSavedRoutesOpen] = useState(false);
  const [addRouteOpen, setAddRouteOpen] = useState(false);

  const { data: badges } = useQuery<{ id: number; badge: string; earnedAt: string | null }[]>({
    queryKey: ['/api/profile/badges'],
  });

  const { data: networkStats } = useQuery<{ totalUsers: number; totalDrivers: number; totalHoppers: number; activeDrivers: number }>({
    queryKey: ['/api/network-stats'],
  });

  const { data: savedRoutes } = useQuery<WalkerRouteData[]>({
    queryKey: ['/api/walker-routes'],
  });

  const addRoute = useMutation({
    mutationFn: async (data: { name: string; startLocation: string; endLocation: string }) => {
      const res = await apiRequest("POST", "/api/walker-routes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/walker-routes'] });
      setAddRouteOpen(false);
      showFlash("📍", "Route saved!", "success");
    },
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/walker-routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/walker-routes'] });
    },
  });

  const routeForm = useForm({
    defaultValues: { name: "", startLocation: "", endLocation: "" },
  });

  const activeHop = hops?.find(h => h.status !== "completed" && h.status !== "cancelled");

  const { data: matchedDriverInfo } = useQuery<DriverInfo | null>({
    queryKey: ['/api/hops', activeHop?.id, 'driver-info'],
    enabled: activeHop?.status === 'matched' && !!activeHop?.id,
  });

  const prevStatusRef = useRef<string | undefined>(undefined);
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [matchedElapsed, setMatchedElapsed] = useState(0);
  const matchedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const geo = useGeolocation();
  const hasActiveHop = !!activeHop;
  useLiveLocationBroadcast(hasActiveHop);
  const tracking = useHopTracking(activeHop?.id, activeHop?.status === 'matched');
  const { spots: pickupSpots } = usePickupGuidance(geo.latitude, geo.longitude);

  const hasFlexSub = user.subscription === "flex_hop" || user.subscription === "power_hop";
  const hasPowerSub = user.subscription === "power_hop";

  useEffect(() => {
    if (activeHop?.status === 'matched' && prevStatusRef.current === 'requested') {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    }
    if (activeHop?.status === 'matched') {
      setMatchedElapsed(0);
      matchedTimerRef.current = setInterval(() => setMatchedElapsed(s => s + 1), 1000);
    } else {
      if (matchedTimerRef.current) clearInterval(matchedTimerRef.current);
    }
    prevStatusRef.current = activeHop?.status;
    return () => { if (matchedTimerRef.current) clearInterval(matchedTimerRef.current); };
  }, [activeHop?.status]);

  useEffect(() => {
    if (!geo.permitted) {
      geo.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (activeHop?.status === 'requested') {
      const seenKey = `shorthop_first_hop_seen_${user.id}`;
      if (!localStorage.getItem(seenKey)) {
        setShowFirstTimeHint(true);
        localStorage.setItem(seenKey, '1');
        const t = setTimeout(() => setShowFirstTimeHint(false), 6000);
        return () => clearTimeout(t);
      }
    }
  }, [activeHop?.status, user.id]);

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { startLocation: "", endLocation: "" }
  });

  const onSearch = (data: z.infer<typeof searchSchema>) => {
    setLocations(data);
    setShowOptions(true);
  };

  const handleRequestHop = (hopType: string = 'short_hop') => {
    requestHop.mutate({ ...locations, hopType } as any, {
      onSuccess: () => setShowOptions(false)
    });
  };

  const handleInvite = async () => {
    const shareData = {
      title: "Join ShortHop",
      text: "Join me on ShortHop — a new way for people in Lexington to share rides along their routes. Shared routes. Real connections.",
      url: window.location.origin,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    }
  };

  const networkLoaded = !!networkStats;
  const driversInCity = networkStats?.activeDrivers ?? 0;

  return (
    <div className="px-4 pt-3 pb-4 max-w-lg mx-auto">

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SeasonalGreeting username={user.username} testId="text-dashboard-title" role="rider" />
          {user.isFounder && user.founderBadge && (
            <Badge className="bg-gradient-to-r from-orange-500 to-green-500 text-white border-0 text-[8px] px-1 py-0 self-end mb-0.5" data-testid="badge-founder">
              🛞
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleInvite} data-testid="button-invite-friends" className="h-8 w-8 rounded-full">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {!activeHop && (
        <Card className="mb-3 border-border/50 shadow-sm" data-testid="card-destination-input">
          <CardContent className="p-3">
            <form onSubmit={form.handleSubmit(onSearch)} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary" />
                  <div className="w-px h-6 bg-border" />
                  <div className="w-2.5 h-2.5 rounded-sm bg-secondary border-2 border-secondary" />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Current location"
                    className="h-9 text-sm rounded-lg bg-muted/40 border-transparent focus:bg-background"
                    data-testid="input-start-location"
                    {...form.register("startLocation")}
                  />
                  <Input
                    placeholder="Where to?"
                    className="h-9 text-sm rounded-lg bg-muted/40 border-transparent focus:bg-background font-medium"
                    data-testid="input-end-location"
                    {...form.register("endLocation")}
                  />
                </div>
              </div>

              {savedRoutes && savedRoutes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {savedRoutes.slice(0, 3).map((r) => (
                    <Button
                      key={r.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] rounded-full px-2.5 gap-1 border-primary/20 text-primary"
                      onClick={() => {
                        form.setValue("startLocation", r.startLocation);
                        form.setValue("endLocation", r.endLocation);
                      }}
                      data-testid={`button-saved-route-${r.id}`}
                    >
                      <Bookmark className="w-2.5 h-2.5" />
                      {r.name}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] rounded-full px-2 text-muted-foreground"
                    onClick={() => setSavedRoutesOpen(true)}
                    data-testid="button-manage-routes"
                  >
                    {savedRoutes.length > 3 ? `+${savedRoutes.length - 3} more` : "Manage"}
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 h-9 rounded-lg text-sm font-bold bg-gradient-to-r from-primary to-accent"
                  data-testid="button-find-options"
                >
                  Find Options
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg text-sm px-3"
                  onClick={() => setSavedRoutesOpen(true)}
                  data-testid="button-open-saved-routes"
                >
                  <Route className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-3 border-border/50 shadow-sm" data-testid="card-driver-status">
        <CardContent className="p-3">
          {activeHop ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${activeHop.status === 'matched' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                  <span className="text-sm font-bold text-foreground" data-testid="text-hop-status">
                    {activeHop.status === 'requested' ? 'Searching for driver...' : 'Driver matched!'}
                  </span>
                </div>
                {activeHop.status === 'matched' && (
                  <span className="text-xs font-mono text-muted-foreground tabular-nums" data-testid="text-matched-timer">
                    {Math.floor(matchedElapsed / 60)}:{String(matchedElapsed % 60).padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{activeHop.startLocation}</span>
                <span className="mx-1.5">→</span>
                <span className="text-foreground font-medium">{activeHop.endLocation}</span>
              </div>

              {activeHop.status === 'requested' && (
                <div className="space-y-2">
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    {driversInCity > 0 ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Car className="w-3.5 h-3.5 text-primary" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{driversInCity}</strong> driver{driversInCity !== 1 ? 's' : ''} active in Lexington
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">No drivers currently heading your direction.</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Drivers in city: <strong className="text-foreground">{driversInCity}</strong> · Near you: <strong className="text-foreground">0</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs rounded-lg text-muted-foreground"
                    onClick={() => cancelHop.mutate(activeHop.id)}
                    disabled={cancelHop.isPending}
                    data-testid="button-change-destination"
                  >
                    <X className="w-3 h-3 mr-1" />
                    {cancelHop.isPending ? "Cancelling..." : "Change Destination"}
                  </Button>
                </div>
              )}

              {activeHop.status === 'matched' && matchedDriverInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 space-y-1.5" data-testid="card-driver-vehicle">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-foreground">Your Driver: {matchedDriverInfo.username}</span>
                  </div>
                  {matchedDriverInfo.vehicleMake && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {matchedDriverInfo.vehicleColor} {matchedDriverInfo.vehicleMake} {matchedDriverInfo.vehicleModel}
                      {matchedDriverInfo.licensePlate && <span className="ml-1 font-mono font-bold text-foreground"> · {matchedDriverInfo.licensePlate}</span>}
                    </p>
                  )}
                </div>
              )}

              {activeHop.status === 'matched' && tracking.available && tracking.distance !== null && (
                <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2.5" data-testid="tracking-distance">
                  <Compass className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-bold text-foreground">
                    {tracking.distance < 0.1 ? 'Almost here!' : `${tracking.distance} mi ${tracking.direction || 'away'}`}
                  </span>
                  <motion.span
                    className="w-2 h-2 rounded-full bg-green-500 ml-auto"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              )}

              <AnimatePresence>
                {showFirstTimeHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="bg-foreground text-background text-xs rounded-lg px-3 py-2"
                    data-testid="tooltip-first-hop"
                  >
                    <p className="font-bold mb-0.5">How it works 👋</p>
                    <p>We match you with drivers already on their commute. Your phone vibrates when someone's heading your way!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-1.5">
              {driversInCity > 0 ? (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{driversInCity}</strong> driver{driversInCity !== 1 ? 's' : ''} active in Lexington
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <span className="text-muted-foreground">No drivers nearby right now</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {networkStats?.totalHoppers ?? 0} hoppers in the network
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(activeHop?.status === 'matched' || showOptions) && (
        <div className="mb-3">
          <PickupMapVisual
            spots={pickupSpots}
            hasLocation={geo.permitted && geo.latitude !== null}
            userLat={geo.latitude}
            userLng={geo.longitude}
            tracking={tracking}
            driverLat={tracking.partnerLat}
            driverLng={tracking.partnerLng}
          />
        </div>
      )}

      {pickupSpots.length > 0 && (
        <Card className="mb-3 border-border/50 shadow-sm" data-testid="card-pickup-corridors">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Pickup Corridors</p>
            <div className="space-y-1.5">
              {pickupSpots.map((spot, i) => (
                <div
                  key={spot.name}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  data-testid={`pickup-spot-${i}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{spot.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{spot.desc}</p>
                    </div>
                  </div>
                  {spot.distance != null && (
                    <span className="text-[10px] font-bold text-primary shrink-0 ml-2">
                      {spot.distance < 0.1 ? 'Here' : `${spot.distance.toFixed(1)} mi`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {showOptions && !activeHop && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2 mb-3"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }}>
              <Card className="border-border/50 shadow-sm cursor-default hover:border-primary/30 transition-colors" data-testid="option-walk">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🚶</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Walk</p>
                      <p className="text-[10px] text-muted-foreground">Healthy movement · transit routes</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">Free</span>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
              <Card className="border-primary/40 shadow-sm bg-primary/5 relative overflow-hidden" data-testid="option-short-hop">
                <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">Recommended</div>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏎️</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Short Hop</p>
                      <p className="text-[10px] text-muted-foreground">Ride along a driver's route</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">$1–3</span>
                    <Button
                      size="sm"
                      className="h-7 text-xs rounded-lg px-3 font-bold"
                      onClick={() => handleRequestHop('short_hop')}
                      disabled={requestHop.isPending}
                      data-testid="button-request-short-hop"
                    >
                      {requestHop.isPending ? '...' : 'Request'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <Card className="border-border/50 shadow-sm" data-testid="option-flex-hop">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🚀</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Flex Hop</p>
                      <p className="text-[10px] text-muted-foreground">Small detours · $5/mo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">$2–5</span>
                    {hasFlexSub ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg px-3 font-bold"
                        onClick={() => handleRequestHop('flex_hop')}
                        disabled={requestHop.isPending}
                        data-testid="button-request-flex-hop"
                      >
                        Request
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg px-3 font-bold"
                        onClick={() => setSubscriptionPlan("flex_hop")}
                        data-testid="button-subscribe-flex"
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        Subscribe
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
              <Card className="border-border/50 shadow-sm" data-testid="option-power-hop">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚡</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Power Hop</p>
                      <p className="text-[10px] text-muted-foreground">Unlimited · $15/mo</p>
                    </div>
                  </div>
                  {hasPowerSub ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs rounded-lg px-3 font-bold"
                      onClick={() => handleRequestHop('full_ride')}
                      disabled={requestHop.isPending}
                      data-testid="button-request-power-hop"
                    >
                      Request
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs rounded-lg px-3 font-bold"
                      onClick={() => setSubscriptionPlan("power_hop")}
                      data-testid="button-subscribe-power"
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      Subscribe
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Card
          className="border-border/50 shadow-sm cursor-pointer hover:border-orange-400/40 transition-colors"
          data-testid="card-streak"
          onClick={() => setStreakOpen(true)}
        >
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-sm">
              <span className="text-base">🔥</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Streak</p>
              <p className="text-lg font-black text-foreground leading-none" data-testid="text-streak-count">{user.hopStreak || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="border-border/50 shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
          data-testid="card-total-hops"
          onClick={() => setHopsOpen(true)}
        >
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-sm">
              <span className="text-base">⭐</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Hops</p>
              <p className="text-lg font-black text-foreground leading-none" data-testid="text-total-hops-count">{user.totalHops || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {badges && badges.length > 0 && (
        <Card className="mb-3 border-border/50 shadow-sm" data-testid="card-badges">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Badges</p>
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b) => {
                const badgeInfo = getBadgeStyle(b.badge);
                const IconComponent = badgeInfo.icon;
                return (
                  <Badge key={b.id} variant="secondary" className="gap-1 py-0.5 px-2 text-[10px]" data-testid={`badge-achievement-${b.id}`}>
                    <IconComponent className={`w-3 h-3 ${badgeInfo.color}`} />
                    {b.badge}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!hasFlexSub && (
        <Card className="border-primary/20 shadow-sm mb-3 bg-gradient-to-r from-primary/5 to-accent/5" data-testid="card-flex-promo">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                  <span className="text-sm">🚀</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Flex Hop</p>
                  <p className="text-[10px] text-muted-foreground">Detour rides, priority matching</p>
                </div>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg font-bold bg-gradient-to-r from-primary to-accent"
                onClick={() => setSubscriptionPlan("flex_hop")}
                data-testid="button-get-flex-hop"
              >
                $5/mo
              </Button>
            </div>
            {!user.isFounder && (
              <p className="text-[9px] text-muted-foreground mt-2 pl-10">
                First 50 founding members get Flex Hop free forever
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm mb-3" data-testid="card-network">
        <CardContent className="p-3">
          <NetworkProgress />
        </CardContent>
      </Card>

      <div className="flex gap-2 mb-3">
        <Card className="flex-1 border-border/50 shadow-sm cursor-pointer hover:border-blue-200 transition-colors" onClick={() => setLocation("/widget")} data-testid="card-widget-preview">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold">Widget</p>
              <p className="text-[9px] text-muted-foreground">Preview</p>
            </div>
          </CardContent>
        </Card>
        {user.isFounder && (
          <Card className="flex-1 border-orange-200/50 shadow-sm cursor-pointer hover:border-orange-300 transition-colors" onClick={() => {
            const el = document.getElementById("founder-chat-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }} data-testid="card-founder-chat-link">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Crown className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold">Founder Chat</p>
                <p className="text-[9px] text-muted-foreground">Direct line</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {networkLoaded && driversInCity === 0 && !activeHop && (
        <Card className="border-dashed border-primary/30 bg-primary/5 mb-3" data-testid="card-invite-drivers">
          <CardContent className="p-3 text-center space-y-2">
            <p className="text-xs font-bold text-foreground">Help grow the network</p>
            <p className="text-[10px] text-muted-foreground">Know someone who drives through Lexington? Invite them to earn Wheels as a driver.</p>
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={handleInvite} data-testid="button-invite-drivers">
              <Share2 className="w-3 h-3 mr-1" />
              Invite Drivers
            </Button>
          </CardContent>
        </Card>
      )}

      {subscriptionPlan && (
        <SubscriptionModal
          plan={subscriptionPlan}
          user={user}
          open={true}
          onOpenChange={(open) => !open && setSubscriptionPlan(null)}
        />
      )}

      {user.isFounder && (
        <div id="founder-chat-section" className="mb-3">
          <FounderChat />
        </div>
      )}

      <Dialog open={streakOpen} onOpenChange={setStreakOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">🔥</span> Hop Streak
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(user.hopStreak || 0) > 0 ? (
              <>
                <div className="text-center py-4">
                  <p className="text-4xl font-black text-foreground">{user.hopStreak}</p>
                  <p className="text-sm text-muted-foreground mt-1">day streak</p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Keep hopping daily to build your streak! Streaks reset after 48 hours of inactivity.
                </p>
              </>
            ) : (
              <div className="text-center py-6 space-y-2" data-testid="text-no-streak">
                <p className="text-3xl">🚶</p>
                <p className="text-sm font-bold text-foreground">You haven't hopped anywhere yet</p>
                <p className="text-xs text-muted-foreground">Request your first hop to start building your streak!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={hopsOpen} onOpenChange={setHopsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">⭐</span> Total Hops
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(user.totalHops || 0) > 0 ? (
              <>
                <div className="text-center py-4">
                  <p className="text-4xl font-black text-foreground">{user.totalHops}</p>
                  <p className="text-sm text-muted-foreground mt-1">hops completed</p>
                </div>
                {hops && hops.filter(h => h.status === 'completed').length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Recent Hops</p>
                    {hops.filter(h => h.status === 'completed').slice(0, 3).map((h) => (
                      <div key={h.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30 text-xs">
                        <span className="text-foreground truncate">{h.startLocation} → {h.endLocation}</span>
                        <Badge variant="secondary" className="text-[9px] shrink-0 ml-2">{h.hopType.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 space-y-2" data-testid="text-no-hops">
                <p className="text-3xl">🚶</p>
                <p className="text-sm font-bold text-foreground">You haven't hopped anywhere yet</p>
                <p className="text-xs text-muted-foreground">Enter a destination and request a hop to get started!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={savedRoutesOpen} onOpenChange={setSavedRoutesOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" /> My Routes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {savedRoutes && savedRoutes.length > 0 ? (
              <div className="space-y-2">
                {savedRoutes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30" data-testid={`saved-route-item-${r.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.startLocation} → {r.endLocation}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-primary"
                        onClick={() => {
                          form.setValue("startLocation", r.startLocation);
                          form.setValue("endLocation", r.endLocation);
                          setSavedRoutesOpen(false);
                        }}
                        data-testid={`button-use-route-${r.id}`}
                      >
                        <Navigation className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteRoute.mutate(r.id)}
                        data-testid={`button-delete-route-${r.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-3xl">📍</p>
                <p className="text-xs text-muted-foreground">No saved routes yet. Add your usual destinations for quick access.</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs rounded-lg"
              onClick={() => { setSavedRoutesOpen(false); setAddRouteOpen(true); }}
              data-testid="button-add-route"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addRouteOpen} onOpenChange={setAddRouteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save a Route</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={routeForm.handleSubmit((data) => addRoute.mutate(data))}
            className="space-y-3"
          >
            <Input
              placeholder="Route name (e.g. Work, Grocery)"
              className="h-9 text-sm"
              data-testid="input-route-name"
              {...routeForm.register("name", { required: true })}
            />
            <Input
              placeholder="Start location"
              className="h-9 text-sm"
              data-testid="input-route-start"
              {...routeForm.register("startLocation", { required: true })}
            />
            <Input
              placeholder="End location"
              className="h-9 text-sm"
              data-testid="input-route-end"
              {...routeForm.register("endLocation", { required: true })}
            />
            <Button
              type="submit"
              className="w-full h-9 rounded-lg text-sm font-bold"
              disabled={addRoute.isPending}
              data-testid="button-save-route"
            >
              {addRoute.isPending ? "Saving..." : "Save Route"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
