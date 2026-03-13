import { useState } from "react";
import { SeasonalGreeting } from "@/components/SeasonalGreeting";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Map, Clock, Calendar, Check, X, Plus, Play, Route as RouteIcon, MapPin, CarFront, Share2, Flame, Award, Star, Power, Shield, AlertTriangle, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRoutes, useCreateRoute, useDeleteRoute } from "@/hooks/use-routes";
import { useHops, useAcceptHop, useCompleteHop } from "@/hooks/use-hops";
import { TrustedHoppers } from "@/components/TrustedHoppers";
import { HopBuddyRating } from "@/components/HopBuddyRating";
import { ShareRideCard } from "@/components/ShareRideCard";
import { useLiveLocationBroadcast } from "@/hooks/use-location";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { DriverRoadSideNotice, buildRoadSideInfo, findCorridorByName } from "@/components/RoadSideGuide";
import { DriverQuestionnaire } from "@/components/DriverQuestionnaire";
import { useLocation } from "wouter";
import type { User } from "@shared/routes";
import type { ShortHop } from "@shared/schema";

function getBadgeStyle(badge: string): { icon: typeof Flame; color: string } {
  if (badge.includes("100")) return { icon: Award, color: "text-red-600" };
  if (badge.includes("50")) return { icon: Flame, color: "text-red-500" };
  if (badge.includes("25")) return { icon: Flame, color: "text-orange-600" };
  if (badge.includes("10")) return { icon: Flame, color: "text-orange-500" };
  if (badge.includes("3")) return { icon: Star, color: "text-yellow-500" };
  if (badge.includes("Founding")) return { icon: Award, color: "text-green-500" };
  return { icon: Award, color: "text-blue-500" };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const routeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startLocation: z.string().min(1, "Start location is required"),
  endLocation: z.string().min(1, "End location is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  days: z.array(z.string()).min(1, "Select at least one day"),
});

type DriverStatus = {
  isDriver: boolean;
  isActive: boolean;
  driverVerified: boolean;
  vehicleMake: string | null;
  applicationStatus: string | null;
};

export default function DriverDashboard({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: routes } = useRoutes();
  const { data: hops } = useHops();
  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const acceptHop = useAcceptHop();
  const completeHop = useCompleteHop();

  const { data: driverStatus } = useQuery<DriverStatus>({
    queryKey: ['/api/driver/status'],
  });

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

  const { data: badges } = useQuery<{ id: number; badge: string; earnedAt: string | null }[]>({
    queryKey: ['/api/profile/badges'],
  });
  
  const hasMatchedHop = hops?.some(h => h.status === 'matched') ?? false;
  useLiveLocationBroadcast(hasMatchedHop || (driverStatus?.isActive ?? false));
  
  const [isRouteOpen, setIsRouteOpen] = useState(false);
  const [completeHopId, setCompleteHopId] = useState<number | null>(null);
  const [distance, setDistance] = useState("1.0");
  const [ratingHop, setRatingHop] = useState<{ tripId: number; ratedUserId: number } | null>(null);
  const [completedHopForShare, setCompletedHopForShare] = useState<ShortHop | null>(null);

  const form = useForm<z.infer<typeof routeSchema>>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "", startLocation: "", endLocation: "", startTime: "", endTime: "", days: []
    }
  });

  const onSubmitRoute = (data: z.infer<typeof routeSchema>) => {
    createRoute.mutate(data, {
      onSuccess: () => {
        setIsRouteOpen(false);
        form.reset();
      }
    });
  };

  const handleComplete = () => {
    if (completeHopId) {
      const hop = activeHops.find(h => h.id === completeHopId);
      completeHop.mutate({ id: completeHopId, data: { distanceMiles: distance } }, {
        onSuccess: (completedHop) => {
          setCompleteHopId(null);
          if (hop) {
            setCompletedHopForShare({ ...hop, status: "completed", distanceMiles: distance });
          }
          if (hop?.walkerId) {
            setRatingHop({ tripId: hop.id, ratedUserId: hop.walkerId });
          }
        }
      });
    }
  };

  const availableHops = hops?.filter(h => h.status === 'requested') || [];
  const activeHops = hops?.filter(h => h.status === 'matched' || h.status === 'in_ride') || [];

  const isVerified = driverStatus?.driverVerified ?? false;
  const isActiveNow = driverStatus?.isActive ?? false;
  const appStatus = driverStatus?.applicationStatus;
  const needsOnboarding = !driverStatus?.vehicleMake && !appStatus;

  return (
    <div className="px-4 pt-3 pb-6 max-w-lg mx-auto space-y-4">
      
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <SeasonalGreeting username={user.username} testId="text-driver-title" role="driver" />
            {user.isFounder && user.founderBadge && (
              <Badge className="bg-gradient-to-r from-orange-500 to-green-500 text-white border-0 text-[8px] px-1 py-0 self-end mb-0.5" data-testid="badge-founder">
                Founder
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Help people along your route.</p>
        </div>
        <Card className="border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent shrink-0 cursor-pointer hover:border-secondary/50 transition-colors" onClick={() => setLocation("/rewards")} data-testid="card-wheels-badge">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-orange-600 flex items-center justify-center text-white shadow-sm"
            >
              <span className="text-base">🛞</span>
            </motion.div>
            <div>
              <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">Wheels</div>
              <div className="text-lg font-black text-foreground leading-none">{user.credits || 0}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>


      {isVerified && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className={`border-2 transition-colors ${isActiveNow ? 'border-green-400 bg-green-50/30' : 'border-border/50'}`} data-testid="card-active-toggle">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isActiveNow ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-muted'
                  }`}>
                    <Power className={`w-5 h-5 ${isActiveNow ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" data-testid="text-active-status">
                      {isActiveNow ? "You're Active" : "You're Offline"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isActiveNow ? "Hoppers can see you and request rides" : "Go active to start accepting hops"}
                    </p>
                  </div>
                </div>
                <Button
                  className={`h-11 px-5 font-bold text-sm rounded-xl shadow-sm ${
                    isActiveNow
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  }`}
                  onClick={() => toggleActive.mutate(!isActiveNow)}
                  disabled={toggleActive.isPending}
                  data-testid="button-toggle-active"
                >
                  {toggleActive.isPending ? '...' : isActiveNow ? 'GO OFFLINE' : 'GO ACTIVE'}
                </Button>
              </div>
              {isActiveNow && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-green-200"
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-green-500"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-xs text-green-700 font-medium">Broadcasting your location to nearby hoppers</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isVerified && !(user as any).driverQuestionnaireCompleted && (
        <DriverQuestionnaire
          onComplete={() => {}}
          initialValues={{
            driverConvoComfort: (user as any).driverConvoComfort,
            driverMusicPref: (user as any).driverMusicPref,
            driverPetsOk: (user as any).driverPetsOk,
            driverGroceriesOk: (user as any).driverGroceriesOk,
            driverLifestyleTags: (user as any).driverLifestyleTags,
          }}
        />
      )}

      <div
        className="bg-gradient-to-r from-primary/5 to-green-500/5 border border-primary/15 rounded-2xl px-4 py-3"
        data-testid="card-driver-philosophy"
      >
        <p className="text-sm text-foreground font-medium">Help people along your route.</p>
        <p className="text-xs text-muted-foreground mt-0.5">Earn Wheels you can cash out anytime.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
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

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Col: Routes */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🛣️ My Routine Routes
            </h2>
            <Dialog open={isRouteOpen} onOpenChange={setIsRouteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full shadow-sm"><Plus className="w-4 h-4 mr-1"/> Add</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Routine Route</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmitRoute)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Route Name</Label>
                    <Input placeholder="e.g. Morning Commute" {...form.register("name")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Location</Label>
                      <Input placeholder="Home" {...form.register("startLocation")} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Location</Label>
                      <Input placeholder="Office" {...form.register("endLocation")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" {...form.register("startTime")} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" {...form.register("endTime")} />
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <Label>Days Active</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <div key={day} className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                          <Checkbox 
                            id={`day-${day}`} 
                            checked={form.watch("days").includes(day)}
                            onCheckedChange={(checked) => {
                              const current = form.watch("days");
                              const updated = checked 
                                ? [...current, day] 
                                : current.filter(d => d !== day);
                              form.setValue("days", updated);
                            }}
                          />
                          <Label htmlFor={`day-${day}`} className="cursor-pointer text-sm">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={createRoute.isPending}>
                    Save Route
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {routes?.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-8 border-2 border-dashed border-primary/20 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent"
              >
                <motion.span 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl block mb-2"
                >
                  🛣️
                </motion.span>
                <p className="text-sm text-muted-foreground font-medium">No routes yet — add your first one!</p>
              </motion.div>
            ) : (
              routes?.map((route, i) => (
                <motion.div 
                  key={route.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="game-card relative overflow-hidden group hover:border-primary/50">
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-primary to-accent rounded-r-full" />
                    <CardContent className="p-4 pl-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-foreground">{route.name}</h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteRoute.mutate(route.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">📍 {route.startLocation} → {route.endLocation}</div>
                        <div className="flex items-center gap-2">🕐 {route.startTime} - {route.endTime}</div>
                        <div className="flex items-center gap-2">📅 {Array.isArray(route.days) ? route.days.join(", ") : ''}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Middle Col: Flex Hop Settings */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🚕 Flex Hop Settings
          </h2>
          
          <Card className="game-card bg-gradient-to-b from-accent/5 to-transparent border-accent/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">Enable Flex Hops</p>
                  <p className="text-xs text-muted-foreground">Allow small detours beyond your route</p>
                </div>
                <Checkbox 
                  checked={user.isFlexibleDriver || false}
                  disabled
                />
              </div>

              {user.isFlexibleDriver && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm">Max Detour Distance (miles)</Label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      defaultValue={user.maxDetourDistance || "1.0"}
                      disabled
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Detour Time (minutes)</Label>
                    <Input 
                      type="number" 
                      defaultValue={user.maxDetourTime || 15}
                      disabled
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
              
              <Button disabled className="w-full mt-2 text-xs">
                {user.isFlexibleDriver ? "Update Settings" : "Enable Flex Hops"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Active & Available Hops */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Hops */}
          {activeHops.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                🟢 Active Hops
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {activeHops.map(hop => (
                  <Card key={hop.id} className="border-primary bg-primary/5 shadow-md">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">Passenger waiting at:</div>
                          <div className="text-lg font-bold text-foreground">{hop.startLocation}</div>
                        </div>
                        <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">MATCHED</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Going to: <strong className="text-foreground">{hop.endLocation}</strong>
                      </div>

                      {(() => {
                        const corridor = findCorridorByName(hop.startLocation);
                        const info = buildRoadSideInfo(corridor, null, null, hop.startLocation, hop.endLocation);
                        return info ? <DriverRoadSideNotice key={hop.id} info={info} minutesAway={5} /> : null;
                      })()}
                      
                      <Dialog open={completeHopId === hop.id} onOpenChange={(open) => !open && setCompleteHopId(null)}>
                        <DialogTrigger asChild>
                          <Button className="w-full" onClick={() => setCompleteHopId(hop.id)}>Complete Hop</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Complete Hop</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Distance Driven (miles)</Label>
                              <Input 
                                type="number" 
                                step="0.1" 
                                value={distance} 
                                onChange={(e) => setDistance(e.target.value)} 
                              />
                            </div>
                            <Button onClick={handleComplete} className="w-full" disabled={completeHop.isPending} data-testid="button-confirm-complete">
                              Confirm & Earn Wheels
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🗺️ Hoppers Along Your Route
            </h2>
            
            {availableHops.length === 0 ? (
              <Card className="border-2 border-dashed border-secondary/20 bg-gradient-to-b from-secondary/5 to-transparent">
                <CardContent className="p-8 text-center">
                  <motion.span 
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-3xl block mb-2"
                  >
                    🔍
                  </motion.span>
                  <p className="text-muted-foreground font-medium">No hops nearby yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to start one.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {availableHops.map((hop, idx) => (
                  <motion.div
                    key={hop.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow border-primary/20" data-testid={`hop-request-${hop.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Along your path</p>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Pick up</div>
                            <div className="text-sm font-bold text-foreground">{hop.startLocation}</div>
                          </div>
                          <div className="flex items-center text-muted-foreground mx-2">→</div>
                          <div className="space-y-1 text-right">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Drop off</div>
                            <div className="text-sm font-bold text-foreground">{hop.endLocation}</div>
                          </div>
                        </div>
                        <Button 
                          className="w-full h-12 text-sm rounded-xl bg-gradient-to-r from-primary to-green-600 font-bold" 
                          onClick={() => acceptHop.mutate(hop.id)}
                          disabled={acceptHop.isPending}
                          data-testid={`button-accept-${hop.id}`}
                        >
                          {acceptHop.isPending ? "Accepting..." : "Accept Hop"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="flex gap-2 mt-4 mb-4">
        <Card className="flex-1 border-border/50 shadow-sm cursor-pointer hover:border-green-200 transition-colors" onClick={() => setLocation("/widget")} data-testid="card-widget-preview">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold">Widget Preview</p>
              <p className="text-[9px] text-muted-foreground">iOS Home Screen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {user.tier === "flexhop" && (
        <div className="grid lg:grid-cols-2 gap-8">
          <TrustedHoppers />
        </div>
      )}

      {ratingHop && (
        <HopBuddyRating
          open={!!ratingHop}
          onOpenChange={(open) => !open && setRatingHop(null)}
          tripId={ratingHop.tripId}
          ratedUserId={ratingHop.ratedUserId}
          userTier={user.tier}
        />
      )}

      {completedHopForShare && (
        <Dialog open={!!completedHopForShare} onOpenChange={(open) => !open && setCompletedHopForShare(null)}>
          <DialogContent className="sm:max-w-md p-0 overflow-visible border-0 bg-transparent shadow-none">
            <ShareRideCard
              hop={completedHopForShare}
              username={user.username}
              onClose={() => setCompletedHopForShare(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
