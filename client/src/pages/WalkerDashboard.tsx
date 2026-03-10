import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, CarFront, Footprints, Clock, CheckCircle2, Share2, Flame, Award, Star, Lock, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHops, useRequestHop } from "@/hooks/use-hops";
import { NetworkProgress } from "@/components/NetworkProgress";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { useGeolocation, useLiveLocationBroadcast, useHopTracking, usePickupGuidance } from "@/hooks/use-location";
import { PickupMapVisual } from "@/components/PickupMapVisual";
import type { User } from "@shared/routes";

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

export default function WalkerDashboard({ user }: { user: User }) {
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const [showOptions, setShowOptions] = useState(false);
  const [locations, setLocations] = useState({ startLocation: "", endLocation: "" });
  const [subscriptionPlan, setSubscriptionPlan] = useState<"flex_hop" | "power_hop" | null>(null);

  const { data: badges } = useQuery<{ id: number; badge: string; earnedAt: string | null }[]>({
    queryKey: ['/api/profile/badges'],
  });

  const activeHop = hops?.find(h => h.status !== "completed" && h.status !== "cancelled");
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

  const handleRequestHop = () => {
    requestHop.mutate(locations, {
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-display font-bold text-foreground">Where to? 🗺️</h1>
            {user.isFounder && user.founderBadge && (
              <Badge className="bg-gradient-to-r from-orange-500 to-green-500 text-white border-0 text-[10px] animate-bounce-in" data-testid="badge-founder">
                🛞 {user.founderBadge}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Find the best way to get there.</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="outline" size="sm" onClick={handleInvite} data-testid="button-invite-friends" className="self-start sm:self-auto rounded-full">
            <Share2 className="w-4 h-4 mr-1.5" />
            Invite Friends
          </Button>
        </motion.div>
      </motion.div>

      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1"
        >
          <Card className="game-card border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent hover:border-orange-500/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider" data-testid="text-streak-label">Hop Streak</div>
                <div className="text-3xl font-black text-foreground" data-testid="text-streak-count">{user.hopStreak || 0}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex-1"
        >
          <Card className="game-card border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:border-primary/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <span className="text-2xl">⭐</span>
              </div>
              <div>
                <div className="text-xs font-bold text-primary uppercase tracking-wider" data-testid="text-total-hops-label">Total Hops</div>
                <div className="text-3xl font-black text-foreground" data-testid="text-total-hops-count">{user.totalHops || 0}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {badges && badges.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-8"
        >
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2" data-testid="text-badges-heading">
            🏆 Achievement Badges
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => {
              const badgeInfo = getBadgeStyle(b.badge);
              const IconComponent = badgeInfo.icon;
              return (
                <motion.div key={b.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                  <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm hover:scale-105 transition-transform cursor-default" data-testid={`badge-achievement-${b.id}`}>
                    <IconComponent className={`w-4 h-4 ${badgeInfo.color}`} />
                    {b.badge}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {activeHop ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <Card className="border-primary/30 shadow-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/5 mb-8 game-card overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden">
                {activeHop.status === 'requested' ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    data-testid="video-hop-animation"
                  >
                    <source src="/hop-animation.mp4" type="video/mp4" />
                  </video>
                ) : (
                  <motion.div
                    className="w-full h-full relative"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <video
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      data-testid="video-hop-matched"
                      ref={(el) => { if (el) { el.currentTime = 0; el.pause(); } }}
                    >
                      <source src="/hop-animation.mp4" type="video/mp4" />
                    </video>
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <span className="text-5xl drop-shadow-lg">👋</span>
                    </motion.div>
                  </motion.div>
                )}
                <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ boxShadow: "inset 8px 0 16px -4px hsl(var(--card)), inset -8px 0 16px -4px hsl(var(--card)), inset 0 8px 16px -4px hsl(var(--card)), inset 0 -8px 16px -4px hsl(var(--card))" }} />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {activeHop.status === 'requested' ? 'Looking for a Driver...' : '🎉 Driver Matched!'}
              </h2>

              <p className="text-sm text-muted-foreground max-w-md">
                From <strong className="text-foreground">{activeHop.startLocation}</strong> to <strong className="text-foreground">{activeHop.endLocation}</strong>
              </p>

              {activeHop.status === 'requested' && (
                <motion.p 
                  className="text-xs text-primary font-medium"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Scanning routine routes along your path...
                </motion.p>
              )}

              {activeHop.status === 'matched' && (
                <div className="space-y-3 w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-3 bg-primary/10 rounded-full px-4 py-2 border border-primary/20 max-w-xs mx-auto"
                  >
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {Math.floor(matchedElapsed / 60)}:{String(matchedElapsed % 60).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-muted-foreground">on their way</span>
                  </motion.div>

                  <PickupMapVisual
                    spots={[]}
                    hasLocation={geo.permitted && geo.latitude !== null}
                    userLat={geo.latitude}
                    userLng={geo.longitude}
                    tracking={tracking}
                    driverLat={tracking.partnerLat}
                    driverLng={tracking.partnerLng}
                  />

                  {tracking.available && tracking.distance !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-center gap-2 bg-accent/10 rounded-full px-4 py-2 border border-accent/20 max-w-xs mx-auto"
                      data-testid="tracking-distance"
                    >
                      <Compass className="w-4 h-4 text-accent" />
                      <span className="text-sm font-bold text-foreground">
                        {tracking.distance < 0.1 ? 'Almost here!' : `${tracking.distance} mi ${tracking.direction || ''}`}
                      </span>
                      <motion.span
                        className="w-2 h-2 rounded-full bg-green-500"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </motion.div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {showFirstTimeHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-foreground text-background text-xs rounded-xl px-4 py-3 max-w-xs shadow-lg"
                    data-testid="tooltip-first-hop"
                  >
                    <p className="font-bold mb-1">How it works 👋</p>
                    <p>We're checking nearby drivers on their routine routes. Your phone will vibrate when someone is heading your way!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-6">
            <Card className="game-card bg-gradient-to-b from-accent/5 to-transparent border-accent/20">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2" data-testid="text-pickup-tips-heading">
                  📍 Best Pickup Spots Nearby
                </h3>
                <PickupMapVisual
                  spots={pickupSpots}
                  hasLocation={geo.permitted && geo.latitude !== null}
                  userLat={geo.latitude}
                  userLng={geo.longitude}
                  tracking={tracking}
                  driverLat={tracking.partnerLat}
                  driverLng={tracking.partnerLng}
                />
              </CardContent>
            </Card>

            <Card className="shadow-lg border-border/50">
              <CardContent className="p-6">
                <form onSubmit={form.handleSubmit(onSearch)} className="space-y-6">
                  <div className="space-y-4 relative">
                    <div className="absolute left-[15px] top-[30px] bottom-[30px] w-0.5 bg-border z-0" />
                    
                    <div className="relative z-10 space-y-2">
                      <Label htmlFor="startLocation" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-8">Current Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input 
                          id="startLocation" 
                          placeholder="e.g. 4th & Main" 
                          className="pl-10 rounded-xl py-6 bg-muted/30 border-transparent focus:bg-background"
                          {...form.register("startLocation")} 
                        />
                      </div>
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                      <Label htmlFor="endLocation" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-8">Destination</Label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                        <Input 
                          id="endLocation" 
                          placeholder="e.g. Central Station" 
                          className="pl-10 rounded-xl py-6 bg-muted/30 border-transparent focus:bg-background"
                          {...form.register("endLocation")} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      type="submit" 
                      className="w-full rounded-xl py-6 text-base font-black shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all"
                    >
                      ⚡ Find Options
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-7">
            <AnimatePresence mode="wait">
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">⚡ Available Options</h3>
                  
                  {/* Option 1: Walk */}
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                    <Card className="game-card border-muted hover:border-primary/30 cursor-default group">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <span className="text-2xl">🚶</span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-foreground text-lg">Walk</h4>
                            <p className="text-sm text-muted-foreground leading-snug max-w-[280px]">Encourages healthy movement. Shows transit routes.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary text-xl">Free</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Option 2: Short Hop */}
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="game-card border-primary/50 ring-2 ring-primary/20 shadow-xl relative overflow-hidden group bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-accent text-white text-[11px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                        ⭐ RECOMMENDED
                      </div>
                      <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="text-2xl">🏎️</span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-foreground text-lg">Short Hop</h4>
                            <p className="text-sm text-muted-foreground leading-snug max-w-[280px]">Advance along a driver's route. Free membership.</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                          <div className="text-left sm:text-right">
                            <div className="font-bold text-foreground text-xl">$1–3</div>
                            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Per ride</div>
                          </div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              onClick={() => requestHop.mutate({ ...locations, hopType: "short_hop" }, { onSuccess: () => setShowOptions(false) })}
                              disabled={requestHop.isPending}
                              className="rounded-full shadow-lg shadow-primary/25 h-12 px-8 font-bold text-base bg-gradient-to-r from-primary to-accent hover:opacity-90"
                            >
                              Request 🚀
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Option 3: Flex Hop */}
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="game-card border-secondary/30 hover:border-secondary group">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                          <span className="text-2xl">🚕</span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-lg">Flex Hop</h4>
                          <p className="text-sm text-muted-foreground leading-snug max-w-[280px]">Allows small driver detours. Dynamic pricing.</p>
                          {hasFlexSub && (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-foreground text-xl">$2–5</div>
                          <div className="text-[11px] text-muted-foreground uppercase font-semibold">Per ride • $5/mo</div>
                        </div>
                        {hasFlexSub ? (
                          <Button 
                            variant="secondary"
                            data-testid="button-request-flex-hop"
                            onClick={() => requestHop.mutate({ ...locations, hopType: "flex_hop" }, { onSuccess: () => setShowOptions(false) })}
                            disabled={requestHop.isPending}
                            className="rounded-full h-12 px-8 font-bold text-base"
                          >
                            Request
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            data-testid="button-subscribe-flex-hop"
                            onClick={() => setSubscriptionPlan("flex_hop")}
                            className="rounded-full h-12 px-8 font-bold text-base"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Subscribe
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  {/* Option 4: Power Hop */}
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="game-card relative overflow-hidden shadow-xl hover:shadow-2xl border-2 border-transparent group"
                    style={{
                      background: "linear-gradient(135deg, rgba(249,115,22,0.05) 0%, rgba(34,197,94,0.05) 100%)",
                      borderImage: "linear-gradient(135deg, #f97316 0%, #22c55e 100%) 1",
                      boxShadow: "0 10px 30px -10px rgba(249, 115, 22, 0.2), 0 20px 40px -15px rgba(34, 197, 94, 0.15)"
                    }}>
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-green-500 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
                          ✨
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-xl">Power Hop</h4>
                          <p className="text-sm text-muted-foreground leading-snug max-w-[300px]">Complete mobility freedom. Anywhere to anywhere.</p>
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-2 uppercase tracking-widest">Reach for the Sky</p>
                          {hasPowerSub && (
                            <Badge className="text-xs bg-gradient-to-r from-orange-500/10 to-green-500/10 text-orange-600 border-orange-500/30">Active</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-foreground text-2xl">$15/mo</div>
                          <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">Unlimited access</div>
                        </div>
                        {hasPowerSub ? (
                          <Button
                            data-testid="button-request-power-hop"
                            onClick={() => requestHop.mutate({ ...locations, hopType: "full_ride" }, { onSuccess: () => setShowOptions(false) })}
                            disabled={requestHop.isPending}
                            className="rounded-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white shadow-xl shadow-orange-500/40 h-14 px-10 font-black text-lg"
                          >
                            Reach
                          </Button>
                        ) : (
                          <Button
                            data-testid="button-subscribe-power-hop"
                            onClick={() => setSubscriptionPlan("power_hop")}
                            className="rounded-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white shadow-xl shadow-orange-500/40 h-14 px-10 font-black text-lg"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Subscribe
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                </motion.div>
              )}
            </AnimatePresence>
            {!showOptions && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 p-12 text-center border-2 border-dashed border-primary/20 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent"
              >
                <motion.span 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-4xl"
                >
                  📍
                </motion.span>
                <p className="font-medium">Enter your locations to see travel options!</p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <NetworkProgress />
      </div>

      {subscriptionPlan && (
        <SubscriptionModal
          open={!!subscriptionPlan}
          onOpenChange={(open) => { if (!open) setSubscriptionPlan(null); }}
          plan={subscriptionPlan}
          user={user}
        />
      )}
    </div>
  );
}
