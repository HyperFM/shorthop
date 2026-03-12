import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Navigation, Bookmark, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHops, useRequestHop } from "@/hooks/use-hops";
import { useGeolocation, usePickupGuidance } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { NearbyHopperAlert } from "@/components/NearbyHopperAlert";
import { useNearbyHopperSimulation } from "@/hooks/use-location";
import DriverDashboard from "./DriverDashboard";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/routes";

const searchSchema = z.object({
  startLocation: z.string().min(2, "Required"),
  endLocation: z.string().min(2, "Required"),
});

type WalkerRouteData = { id: number; name: string; startLocation: string; endLocation: string };

function InstaHopView({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const [payWithWheels, setPayWithWheels] = useState(false);
  const geo = useGeolocation();

  const activeHop = hops?.find(h => h.status !== "completed" && h.status !== "cancelled");

  const { data: savedRoutes } = useQuery<WalkerRouteData[]>({
    queryKey: ['/api/walker-routes'],
  });

  const { data: networkStats } = useQuery<{ totalUsers: number; totalDrivers: number; totalHoppers: number; activeDrivers: number }>({
    queryKey: ['/api/network-stats'],
  });

  const driversInCity = networkStats?.activeDrivers ?? 0;

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { startLocation: "", endLocation: "" }
  });

  useEffect(() => {
    if (!geo.permitted) {
      geo.requestPermission();
    }
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
    requestHop.mutate({ ...data, hopType: 'short_hop', payWithWheels } as any, {
      onSuccess: () => {
        setPayWithWheels(false);
        showFlash("⚡", "InstaHop requested!", "success");
      }
    });
  };

  if (activeHop) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto flex flex-col items-center min-h-[calc(100vh-8rem)]">
      <div className="w-full flex-1 flex flex-col justify-center max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-foreground" data-testid="text-instahop-title">InstaHop</h1>
          <p className="text-xs text-muted-foreground mt-1">Find a ride instantly</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-primary" />
                <Input
                  placeholder="Current location"
                  className="h-14 text-sm rounded-2xl bg-muted/40 border-border/50 pl-10 focus:bg-background"
                  data-testid="input-instahop-start"
                  {...form.register("startLocation")}
                />
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm bg-secondary border-2 border-secondary" />
                <Input
                  placeholder="Where to?"
                  className="h-14 text-sm rounded-2xl bg-muted/40 border-border/50 pl-10 focus:bg-background font-semibold"
                  data-testid="input-instahop-destination"
                  {...form.register("endLocation")}
                />
              </div>
            </div>

            {savedRoutes && savedRoutes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
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
                    data-testid={`button-instahop-route-${r.id}`}
                  >
                    <Bookmark className="w-3 h-3" />
                    {r.name}
                  </Button>
                ))}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={requestHop.isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full h-16 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-500/25 transition-all disabled:opacity-60"
              data-testid="button-instahop"
            >
              <Zap className="w-6 h-6" />
              {requestHop.isPending ? 'Finding...' : 'InstaHop'}
            </motion.button>

            {(user.credits || 0) > 0 && (
              <button
                type="button"
                onClick={() => setPayWithWheels(!payWithWheels)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  payWithWheels
                    ? 'bg-secondary/20 text-secondary border border-secondary/40'
                    : 'bg-muted/30 text-muted-foreground border border-transparent hover:border-secondary/30'
                }`}
                data-testid="toggle-instahop-wheels"
              >
                <span>🛞</span>
                {payWithWheels ? `Paying with Wheels (${user.credits} available)` : `Pay with Wheels (${user.credits} 🛞)`}
              </button>
            )}
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Car className="w-3.5 h-3.5" />
            <span>{driversInCity > 0 ? `${driversInCity} driver${driversInCity !== 1 ? 's' : ''} active nearby` : 'Drivers coming soon'}</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2">$1–5 per hop</p>
        </motion.div>
      </div>
    </div>
  );
}

export default function InstaHop() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"hopper" | "driver">("hopper");
  const { currentHopper, dismiss } = useNearbyHopperSimulation(!!user?.isDriver);

  useEffect(() => {
    if (user?.isDriver) {
      setMode("driver");
    }
  }, [user?.isDriver]);

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

  return (
    <>
      {mode === "hopper" ? (
        <InstaHopView user={user} />
      ) : (
        <>
          <NearbyHopperAlert hopper={currentHopper} onDismiss={dismiss} />
          <DriverDashboard user={user} />
        </>
      )}

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40" data-testid="mode-switcher">
        <div className="flex items-center bg-background/95 backdrop-blur-lg rounded-full border border-border/60 shadow-lg p-1">
          <button
            onClick={() => setMode("hopper")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              mode === "hopper"
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="button-mode-hopper"
          >
            Hopper
          </button>
          <button
            onClick={() => setMode("driver")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              mode === "driver"
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="button-mode-driver"
          >
            Driver
          </button>
        </div>
      </div>
    </>
  );
}
