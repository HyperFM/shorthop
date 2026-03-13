import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import WalkerDashboard from "./WalkerDashboard";
import DriverDashboard from "./DriverDashboard";
import { NearbyHopperAlert } from "@/components/NearbyHopperAlert";
import { useNearbyHopperSimulation } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { Loader2, Bell, Gift, Crown, ChevronRight, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { getDriverSoundDuration, setDriverSoundDuration, type DriverSoundDuration } from "@/lib/sounds";

export default function Dashboard() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { currentHopper, dismiss } = useNearbyHopperSimulation(!!user?.isDriver);
  const [activeTab, setActiveTab] = useState<"hopper" | "driver">(
    user?.isDriver ? "driver" : "hopper"
  );
  const welcomeShown = useRef(false);
  const [subModal, setSubModal] = useState<"flex_hop" | "power_hop" | null>(null);
  const [soundDuration, setSoundDuration] = useState<DriverSoundDuration>(getDriverSoundDuration);

  useEffect(() => {
    function onDurationChange(e: Event) {
      setSoundDuration((e as CustomEvent).detail);
    }
    window.addEventListener("sh-sound-duration-change", onDurationChange);
    return () => window.removeEventListener("sh-sound-duration-change", onDurationChange);
  }, []);

  function toggleSoundDuration() {
    const next: DriverSoundDuration = soundDuration === "full" ? "short" : "full";
    setDriverSoundDuration(next);
    setSoundDuration(next);
    showFlash("🔔", `Alert sound: ${next === "full" ? "8 seconds" : "2 seconds"}`, "info");
    try { navigator.vibrate?.(20); } catch {}
  }

  useEffect(() => {
    if (user && !welcomeShown.current) {
      welcomeShown.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.get("subscription") === "success") {
        const plan = params.get("plan");
        showFlash("🎉", `${plan === "power_hop" ? "Power Hop" : "Flex Hop"} subscription activated!`, "success");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("subscription") === "cancelled") {
        showFlash("ℹ️", "Subscription checkout cancelled", "info");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("tip") === "success") {
        showFlash("💰", "Tip sent successfully!", "success");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("tip") === "cancelled") {
        showFlash("ℹ️", "Tip cancelled", "info");
        window.history.replaceState({}, "", "/dashboard");
      }
    }
  }, [user]);

  function vibrate() {
    try { navigator.vibrate?.(30); } catch {}
  }

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

  const isFlexPlus = user.subscription === "flex_hop" || user.subscription === "power_hop";

  return (
    <>
      {subModal && (
        <SubscriptionModal
          plan={subModal}
          onClose={() => setSubModal(null)}
        />
      )}

      {activeTab === "driver" && (
        <NearbyHopperAlert hopper={currentHopper} onDismiss={dismiss} />
      )}

      {/* Mode switcher — top of page, in flow */}
      <div className="flex justify-center pt-4 pb-2" data-testid="mode-switcher">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl bg-orange-400/20 scale-110 -z-10" />
          <div className="relative flex items-center bg-card/98 backdrop-blur-xl rounded-full border border-orange-400/40 shadow-lg p-1">
            <motion.div
              className="absolute top-1 bottom-1 rounded-full"
              animate={{
                left: activeTab === "hopper" ? 4 : "50%",
                right: activeTab === "driver" ? 4 : "50%",
                background: activeTab === "hopper"
                  ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                  : "linear-gradient(135deg, #16a34a, #15803d)",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
            <button
              onClick={() => { setActiveTab("hopper"); vibrate(); }}
              className={`relative z-10 px-7 py-2 rounded-full text-xs font-black tracking-wide transition-colors ${
                activeTab === "hopper" ? "text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-hopper"
            >
              Hopper
            </button>
            <button
              onClick={() => { setActiveTab("driver"); vibrate(); }}
              className={`relative z-10 px-7 py-2 rounded-full text-xs font-black tracking-wide transition-colors ${
                activeTab === "driver" ? "text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-driver"
            >
              Driver
            </button>
          </div>
        </div>
      </div>

      {activeTab === "driver" ? (
        <DriverDashboard user={user} />
      ) : (
        <WalkerDashboard user={user} />
      )}

      <div className="max-w-lg mx-auto px-4 pb-4 space-y-3 mt-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Tailor</p>
          <button onClick={() => setLocation("/settings")} className="text-[10px] text-orange-500 font-semibold flex items-center gap-0.5" data-testid="link-tailor-settings">
            Full Settings <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {!isFlexPlus && (
          <Card className="border-orange-300/40 bg-gradient-to-r from-orange-50/60 to-amber-50/60 dark:from-orange-950/20 dark:to-amber-950/10">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-foreground">Upgrade Membership</p>
                <p className="text-[10px] text-muted-foreground">FlexHop $10/mo • PowerHop $25/mo</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setSubModal("flex_hop")} className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-[10px] font-bold" data-testid="button-tailor-flexhop">Flex</button>
                <button onClick={() => setSubModal("power_hop")} className="px-3 py-1.5 rounded-xl bg-orange-500 text-white text-[10px] font-bold" data-testid="button-tailor-powerhop">Power</button>
              </div>
            </CardContent>
          </Card>
        )}

        {isFlexPlus && (
          <Card className="border-green-300/40 bg-gradient-to-r from-green-50/60 to-emerald-50/40 dark:from-green-950/20 dark:to-emerald-950/10">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Crown className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-foreground">{user.subscription === "power_hop" ? "PowerHop" : "FlexHop"} Active</p>
                <p className="text-[10px] text-muted-foreground">{user.subscription === "power_hop" ? "$25/mo • Unlimited rides" : "$10/mo • Flexible detours"}</p>
              </div>
              <Badge className="ml-auto text-[9px] bg-green-500/10 text-green-600 border-green-500/30 h-5">Active</Badge>
            </CardContent>
          </Card>
        )}

        {user.referralCode && (
          <Card className="border-border/40">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-secondary shrink-0" />
                <div>
                  <p className="text-xs font-black text-foreground">Your Referral Code</p>
                  <p className="text-[10px] font-mono text-orange-500 font-bold tracking-wider" data-testid="text-tailor-referral">{user.referralCode}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(user.referralCode!);
                    showFlash("📋", "Copied!", "success");
                  } catch { showFlash("📋", user.referralCode!, "info"); }
                }}
                className="px-3 py-1.5 rounded-xl bg-muted/60 text-[10px] font-bold text-foreground"
                data-testid="button-tailor-copy-referral"
              >
                Copy
              </button>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/40">
          <CardContent className="py-3 px-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-accent shrink-0" />
                <p className="text-xs font-black text-foreground">Notifications & Alerts</p>
              </div>
              <button
                onClick={() => setLocation("/settings")}
                className="text-[10px] text-orange-500 font-bold flex items-center gap-0.5"
                data-testid="link-tailor-notifications"
              >
                All Settings <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/30">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">Driver Approaching Sound</p>
                  <p className="text-[10px] text-muted-foreground">Duration of the alert tone</p>
                </div>
              </div>
              <button
                onClick={toggleSoundDuration}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all border ${
                  soundDuration === "full"
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-400/30"
                    : "bg-muted/60 text-foreground border-border/50"
                }`}
                data-testid="button-sound-duration"
              >
                {soundDuration === "full" ? "8 seconds" : "2 seconds"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

    </>
  );
}
