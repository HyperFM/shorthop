import { useState, useEffect, useRef } from "react";
import { SeasonalGreeting } from "@/components/SeasonalGreeting";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Share2, Compass, Users, Car, Radio, ChevronRight, X, Plus, Route, Bookmark, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHops, useRequestHop, useCancelHop } from "@/hooks/use-hops";
import { HopBuddyRating } from "@/components/HopBuddyRating";
import { FounderChat } from "@/components/FounderChat";
import { useGeolocation, useLiveLocationBroadcast, useHopTracking, usePickupGuidance } from "@/hooks/use-location";
import { PickupMapVisual } from "@/components/PickupMapVisual";
import { CorridorNavigation } from "@/components/CorridorNavigation";
import { MatchInsightBubble } from "@/components/MatchInsightBubble";
import { InterestTags, SharedInterestsBadge } from "@/components/InterestBubbles";
import { SmartMatchCard } from "@/components/SmartMatchCard";
import { FirstHopCelebration } from "@/components/FirstHopCelebration";
import { LiveRideOverlay } from "@/components/LiveRideOverlay";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { playDriverApproachingSound } from "@/lib/sounds";
import type { PickupSpot } from "@/hooks/use-location";
import type { User } from "@shared/routes";

type DriverInfo = {
  username: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  licensePlate: string | null;
  driverConvoComfort: string | null;
  driverMusicPref: string | null;
  driverPetsOk: boolean | null;
  driverGroceriesOk: boolean | null;
  driverLifestyleTags: string | null;
  driverQuestionnaireCompleted: boolean | null;
  rideVibe: string | null;
  bio: string | null;
  interests: string | null;
};

const searchSchema = z.object({
  startLocation: z.string().min(2, "Required"),
  endLocation: z.string().min(2, "Required"),
});

type WalkerRouteData = { id: number; name: string; startLocation: string; endLocation: string };

export default function WalkerDashboard({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const cancelHop = useCancelHop();
  const [showOptions, setShowOptions] = useState(false);
  const [locations, setLocations] = useState({ startLocation: "", endLocation: "" });
  const [streakOpen, setStreakOpen] = useState(false);
  const [hopsOpen, setHopsOpen] = useState(false);
  const [savedRoutesOpen, setSavedRoutesOpen] = useState(false);
  const [addRouteOpen, setAddRouteOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingHop, setRatingHop] = useState<{ tripId: number; driverId: number; driverName: string } | null>(null);
  const [payWithWheels, setPayWithWheels] = useState(false);
  const lastCompletedRef = useRef<number | null>(null);
  const [showInsightBubble, setShowInsightBubble] = useState(false);
  const [selectedCorridor, setSelectedCorridor] = useState<PickupSpot | null>(null);
  const [scheduleBannerDismissed, setScheduleBannerDismissed] = useState(() => {
    try { return sessionStorage.getItem('schedule_banner_dismissed') === '1'; } catch { return false; }
  });

  const { data: mySchedules = [] } = useQuery<any[]>({
    queryKey: ['/api/schedules'],
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
    enabled: (activeHop?.status === 'matched' || activeHop?.status === 'in_ride') && !!activeHop?.id,
  });

  const { data: hopStats } = useQuery<{ completedHops: number }>({
    queryKey: ['/api/hop-stats'],
  });

  const prevStatusRef = useRef<string | undefined>(undefined);
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [matchedElapsed, setMatchedElapsed] = useState(0);
  const matchedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRideMutation = useMutation({
    mutationFn: async (hopId: number) => {
      const res = await apiRequest("POST", `/api/hops/${hopId}/start-ride`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
      showFlash("🚗", "Ride started!", "success");
    },
  });

  const autoCompleteMutation = useMutation({
    mutationFn: async (hopId: number) => {
      const res = await apiRequest("POST", `/api/hops/${hopId}/auto-complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hops'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hop-stats'] });
      showFlash("🎉", "Ride completed!", "success");
    },
  });

  const geo = useGeolocation();
  const hasActiveHop = !!activeHop;
  useLiveLocationBroadcast(hasActiveHop);
  const tracking = useHopTracking(activeHop?.id, activeHop?.status === 'matched' || activeHop?.status === 'in_ride');
  const { spots: pickupSpots } = usePickupGuidance(geo.latitude, geo.longitude);

  const hasFlexSub = user.subscription === "flex_hop" || user.subscription === "power_hop";
  const hasPowerSub = user.subscription === "power_hop";

  useEffect(() => {
    if (activeHop?.status === 'matched' && prevStatusRef.current === 'requested') {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
      playDriverApproachingSound();
      setShowInsightBubble(true);
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

  const autoCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeHop?.status === 'matched' && tracking?.distance !== undefined) {
      const distFeet = tracking.distance;
      if (distFeet < 150) {
        if (!autoStartTimerRef.current) {
          autoStartTimerRef.current = setTimeout(() => {
            startRideMutation.mutate(activeHop.id);
            autoStartTimerRef.current = null;
          }, 5000);
        }
      } else {
        if (autoStartTimerRef.current) {
          clearTimeout(autoStartTimerRef.current);
          autoStartTimerRef.current = null;
        }
      }
    }

    if (activeHop?.status === 'in_ride' && tracking?.distance !== undefined) {
      if (tracking.distance > 0.5) {
        if (!autoCompleteTimerRef.current) {
          autoCompleteTimerRef.current = setTimeout(() => {
            autoCompleteMutation.mutate(activeHop.id);
            autoCompleteTimerRef.current = null;
          }, 10000);
        }
      } else {
        if (autoCompleteTimerRef.current) {
          clearTimeout(autoCompleteTimerRef.current);
          autoCompleteTimerRef.current = null;
        }
      }
    }

    return () => {
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
      if (autoCompleteTimerRef.current) {
        clearTimeout(autoCompleteTimerRef.current);
        autoCompleteTimerRef.current = null;
      }
    };
  }, [activeHop?.status, tracking?.distance]);

  useEffect(() => {
    if (prevStatusRef.current === 'in_ride' && activeHop === undefined) {
      const celebrationKey = `shorthop_celebration_${user.id}`;
      if (hopStats && hopStats.completedHops === 1 && !sessionStorage.getItem(celebrationKey)) {
        sessionStorage.setItem(celebrationKey, '1');
        setShowCelebration(true);
      }
    }
  }, [activeHop, hopStats?.completedHops]);

  useEffect(() => {
    if (!hops) return;
    const completedWithDriver = hops
      .filter(h => h.status === "completed" && h.driverId)
      .sort((a, b) => b.id - a.id);
    const latest = completedWithDriver[0];
    if (latest && lastCompletedRef.current !== latest.id) {
      lastCompletedRef.current = latest.id;
      setRatingHop({
        tripId: latest.id,
        driverId: latest.driverId!,
        driverName: "your driver",
      });
      setRatingOpen(true);
    }
  }, [hops]);

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { startLocation: "", endLocation: "" }
  });

  const onSearch = (data: z.infer<typeof searchSchema>) => {
    setLocations(data);
    setShowOptions(true);
  };

  const handleRequestHop = (hopType: string = 'short_hop') => {
    requestHop.mutate({ ...locations, hopType, payWithWheels } as any, {
      onSuccess: () => { setShowOptions(false); setPayWithWheels(false); }
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

  useEffect(() => {
    if (activeHop?.status === 'matched' && pickupSpots.length > 0 && !selectedCorridor) {
      setSelectedCorridor(pickupSpots[0]);
    }
  }, [activeHop?.status, pickupSpots]);

  if (selectedCorridor) {
    const navLat = geo.latitude ?? selectedCorridor.lat;
    const navLng = geo.longitude ?? selectedCorridor.lng;
    return (
      <CorridorNavigation
        spot={selectedCorridor}
        userLat={navLat}
        userLng={navLng}
        tracking={tracking}
        driverLat={tracking.partnerLat}
        driverLng={tracking.partnerLng}
        hopStatus={activeHop?.status}
        onBack={() => setSelectedCorridor(null)}
      />
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 max-w-lg mx-auto">

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="text-dashboard-title">
            Happy Hopping, {user.username}
          </h1>
          {user.isFounder && user.founderBadge && (
            <Badge className="bg-gradient-to-r from-orange-500 to-green-500 text-white border-0 text-[9px] px-1.5 py-0 mt-1" data-testid="badge-founder">
              🛞 Founder
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleInvite} data-testid="button-invite-friends" className="h-10 w-10 rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {!scheduleBannerDismissed && mySchedules.length === 0 && !activeHop && (
        <Card className="mb-4 border-orange-200/50 dark:border-orange-800/30 shadow-sm rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20" data-testid="card-schedule-banner">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">ShortHop works best with schedules</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add your regular trips and we'll match you with people going the same way.</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="h-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white gap-1.5 px-4"
                    onClick={() => setLocation("/schedule")}
                    data-testid="button-banner-add-schedule"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Add Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 rounded-xl text-muted-foreground"
                    onClick={() => {
                      setScheduleBannerDismissed(true);
                      try { sessionStorage.setItem('schedule_banner_dismissed', '1'); } catch {}
                    }}
                    data-testid="button-banner-dismiss"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!activeHop && (
        <SmartMatchCard onRequestHop={(direction) => {
          const parts = direction.split(' → ');
          if (parts.length === 2) {
            form.setValue("startLocation", parts[0]);
            form.setValue("endLocation", parts[1]);
          }
        }} />
      )}

      {!activeHop && (
        <Card className="mb-4 border-border/50 shadow-md rounded-2xl" data-testid="card-destination-input">
          <CardContent className="p-4">
            <form onSubmit={form.handleSubmit(onSearch)} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary" />
                  <div className="w-px h-8 bg-border" />
                  <div className="w-3 h-3 rounded-sm bg-secondary border-2 border-secondary" />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Current location"
                    className="h-11 text-sm rounded-xl bg-muted/40 border-transparent focus:bg-background"
                    data-testid="input-start-location"
                    {...form.register("startLocation")}
                  />
                  <Input
                    placeholder="Where to?"
                    className="h-11 text-sm rounded-xl bg-muted/40 border-transparent focus:bg-background font-semibold"
                    data-testid="input-end-location"
                    {...form.register("endLocation")}
                  />
                </div>
              </div>

              {savedRoutes && savedRoutes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {savedRoutes.slice(0, 3).map((r) => (
                    <Button
                      key={r.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-full px-3 gap-1 border-primary/20 text-primary"
                      onClick={() => {
                        form.setValue("startLocation", r.startLocation);
                        form.setValue("endLocation", r.endLocation);
                      }}
                      data-testid={`button-saved-route-${r.id}`}
                    >
                      <Bookmark className="w-3 h-3" />
                      {r.name}
                    </Button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="w-full primary-action-btn flex items-center justify-center gap-2"
                data-testid="button-find-options"
              >
                <Navigation className="w-5 h-5" />
                Find Hop
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-3 border-border/50 shadow-sm" data-testid="card-driver-status">
        <CardContent className="p-3">
          {activeHop ? (
            <div className="space-y-3">
              {activeHop.status === 'in_ride' && matchedDriverInfo ? (
                <LiveRideOverlay
                  driverName={matchedDriverInfo.username}
                  destination={activeHop.endLocation}
                  startLocation={activeHop.startLocation}
                  rideStartedAt={(activeHop as any).rideStartedAt}
                  distanceMiles={activeHop.distanceMiles}
                />
              ) : (
              <>
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
                <>
                  <MatchInsightBubble
                    driverName={matchedDriverInfo.username}
                    visible={showInsightBubble}
                    onDismiss={() => setShowInsightBubble(false)}
                  />
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg p-2.5 space-y-1.5" data-testid="card-driver-vehicle">
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
                    {(matchedDriverInfo.driverQuestionnaireCompleted || matchedDriverInfo.bio || matchedDriverInfo.interests) && (() => {
                      const driverInterests = matchedDriverInfo.interests ? matchedDriverInfo.interests.split(',').filter(Boolean) : [];
                      const myInterests = (user as any)?.interests ? String((user as any).interests).split(',').filter(Boolean) : [];
                      const sharedInterests = driverInterests.filter((i: string) => myInterests.includes(i));
                      return (
                        <div className="pl-6 pt-1 space-y-1.5 border-t border-green-100 dark:border-green-800/30 mt-1.5" data-testid="driver-profile-details">
                          {matchedDriverInfo.bio && (
                            <p className="text-[11px] text-foreground/80 italic leading-snug" data-testid="text-driver-bio">"{matchedDriverInfo.bio}"</p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {matchedDriverInfo.driverConvoComfort && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full px-2 py-0.5">
                                {matchedDriverInfo.driverConvoComfort === 'quiet' ? '🤫 Quiet' : matchedDriverInfo.driverConvoComfort === 'friendly_chat' ? '😊 Chatty' : '🤝 Flexible'}
                              </span>
                            )}
                            {matchedDriverInfo.driverMusicPref && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
                                {matchedDriverInfo.driverMusicPref === 'no_music' ? '🔇 No music' : matchedDriverInfo.driverMusicPref === 'low_bg' ? '🔉 Low BG' : matchedDriverInfo.driverMusicPref === 'rider_choice' ? "🎵 Rider's pick" : '🎶 Playlist'}
                              </span>
                            )}
                            {matchedDriverInfo.driverPetsOk !== null && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5">
                                {matchedDriverInfo.driverPetsOk ? '🐾 Pet OK' : '🚫 No pets'}
                              </span>
                            )}
                            {matchedDriverInfo.driverGroceriesOk !== null && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5">
                                {matchedDriverInfo.driverGroceriesOk ? '🛍️ Items OK' : '🙅 No items'}
                              </span>
                            )}
                          </div>
                          {driverInterests.length > 0 && (
                            <div className="space-y-1">
                              <InterestTags interests={driverInterests} highlight={sharedInterests} />
                              {sharedInterests.length > 0 && <SharedInterestsBadge count={sharedInterests.length} />}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
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
              </>
              )}
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
                  <span className="text-muted-foreground">No hops nearby yet. Be the first to start one.</span>
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
        <Card className="mb-3 border-border/50 shadow-sm rounded-2xl" data-testid="card-pickup-corridors">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Nearest Roads</p>
            <div className="space-y-1.5">
              {pickupSpots.map((spot, i) => (
                <button
                  key={`${spot.name}-${i}`}
                  type="button"
                  className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 active:bg-muted/60 transition-colors text-left"
                  onClick={() => setSelectedCorridor(spot)}
                  data-testid={`pickup-spot-${i}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{spot.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{spot.corridorType || 'busy road'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {spot.distance != null && (
                      <span className="text-[10px] font-bold text-primary">
                        {spot.distance < 0.1 ? 'Right here' : `${spot.distance.toFixed(1)} mi`}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </button>
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
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="text-center mb-1"
            >
              <p className="text-sm font-bold text-foreground" data-testid="text-heading-prompt">Choose your ride</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05, type: "spring", stiffness: 200 }}>
              <Card className="border-green-300/60 dark:border-green-700/60 shadow-sm" data-testid="option-walk">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🚶</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">Walk</p>
                        <p className="text-[10px] text-muted-foreground">Drivers may spot you along the way</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-600">Free</span>
                      <Button
                        size="sm"
                        className="h-8 text-xs rounded-xl px-4 font-bold bg-green-600 hover:bg-green-700"
                        onClick={() => handleRequestHop('walk')}
                        disabled={requestHop.isPending}
                        data-testid="button-request-walk"
                      >
                        Go
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <Card className="border-primary/40 shadow-sm" data-testid="option-short-hop">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏎️</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">Short Hop</p>
                        <p className="text-[10px] text-muted-foreground">Ride along a driver's route</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{payWithWheels ? '1-5 🛞' : '$1–5'}</span>
                      <Button
                        size="sm"
                        className="h-8 text-xs rounded-xl px-4 font-bold"
                        onClick={() => handleRequestHop('short_hop')}
                        disabled={requestHop.isPending}
                        data-testid="button-request-short-hop"
                      >
                        {requestHop.isPending ? '...' : 'Request'}
                      </Button>
                    </div>
                  </div>
                  {(user.credits || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayWithWheels(!payWithWheels)}
                      className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        payWithWheels
                          ? 'bg-secondary/20 text-secondary border border-secondary/40'
                          : 'bg-muted/30 text-muted-foreground border border-transparent hover:border-secondary/30'
                      }`}
                      data-testid="toggle-pay-wheels"
                    >
                      <span>🛞</span>
                      {payWithWheels ? `Paying with Wheels (${user.credits} available)` : `Pay with Wheels (${user.credits} 🛞)`}
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {hasFlexSub && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <Card className="border-blue-300/60 dark:border-blue-700/60 shadow-sm" data-testid="option-flex-hop">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🚀</span>
                        <div>
                          <p className="text-sm font-bold text-foreground">FlexHop</p>
                          <p className="text-[10px] text-muted-foreground">Auto-Hop with scheduling</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">$2–5</span>
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-xl px-4 font-bold"
                          onClick={() => handleRequestHop('flex_hop')}
                          disabled={requestHop.isPending}
                          data-testid="button-request-flex-hop"
                        >
                          Request
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {hasPowerSub && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card className="border-orange-300/60 dark:border-orange-700/60 shadow-sm" data-testid="option-power-hop">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⚡</span>
                        <div>
                          <p className="text-sm font-bold text-foreground">PowerHop</p>
                          <p className="text-[10px] text-muted-foreground">Premium connection tier</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Priority</span>
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-xl px-4 font-bold"
                          onClick={() => handleRequestHop('full_ride')}
                          disabled={requestHop.isPending}
                          data-testid="button-request-power-hop"
                        >
                          Request
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {pickupSpots.length > 0 && !activeHop && (
        <Card className="mb-4 border-border/50 shadow-sm rounded-2xl" data-testid="card-pickup-corridors-section">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Nearest Roads</p>
            <p className="text-[10px] text-muted-foreground mb-3">Walk to the closest busy road. Stand on the side where traffic flows your direction.</p>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {pickupSpots.slice(0, 5).map((spot, i) => (
                <button
                  key={`${spot.name}-${i}`}
                  type="button"
                  className="w-full flex items-center justify-between py-3 px-3 rounded-xl bg-muted/30 hover:bg-muted/50 active:bg-muted/60 transition-colors text-left"
                  onClick={() => setSelectedCorridor(spot)}
                  data-testid={`pickup-area-${i}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{spot.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{spot.corridorType || 'busy road'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {spot.distance != null && (
                      <span className="text-xs font-bold text-primary">
                        {spot.distance < 0.1 ? 'Right here' : `${spot.distance.toFixed(1)} mi`}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStreakOpen(true)} data-testid="card-streak">
          <span className="text-lg">🔥</span>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">Streak</p>
            <p className="text-sm font-black text-foreground leading-none" data-testid="text-streak-count">{user.hopStreak || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setHopsOpen(true)} data-testid="card-total-hops">
          <span className="text-lg">⭐</span>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">Hops</p>
            <p className="text-sm font-black text-foreground leading-none" data-testid="text-total-hops-count">{user.totalHops || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">🛞</span>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">Wheels</p>
            <p className="text-sm font-black text-foreground leading-none">{user.credits || 0}</p>
          </div>
        </div>
      </div>

      {networkLoaded && driversInCity === 0 && !activeHop && (
        <Card className="border-dashed border-primary/30 bg-primary/5 mb-4 rounded-2xl" data-testid="card-invite-drivers">
          <CardContent className="p-4 text-center space-y-3">
            <p className="text-sm font-bold text-foreground">No hops nearby yet.</p>
            <p className="text-xs text-muted-foreground">Be the first to start one.</p>
            <Button className="h-11 text-sm rounded-xl font-semibold px-6" onClick={handleInvite} data-testid="button-invite-drivers">
              <Share2 className="w-4 h-4 mr-2" />
              Invite Friends
            </Button>
          </CardContent>
        </Card>
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

      {ratingHop && (
        <HopBuddyRating
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          tripId={ratingHop.tripId}
          ratedUserId={ratingHop.driverId}
          ratedUsername={ratingHop.driverName}
          userTier={user.tier}
          showTip={true}
        />
      )}

      <FirstHopCelebration
        show={showCelebration}
        onDismiss={() => {
          setShowCelebration(false);
          queryClient.invalidateQueries({ queryKey: ['/api/hop-stats'] });
          queryClient.invalidateQueries({ queryKey: ['/api/smart-matches'] });
        }}
      />
    </div>
  );
}
