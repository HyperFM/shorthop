import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import WalkerDashboard from "./WalkerDashboard";
import DriverDashboard from "./DriverDashboard";
import { NearbyHopperAlert } from "@/components/NearbyHopperAlert";
import { useNearbyHopperSimulation } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { currentHopper, dismiss } = useNearbyHopperSimulation(!!user?.isDriver);
  const [activeTab, setActiveTab] = useState<"hopper" | "driver">(
    user?.isDriver ? "driver" : "hopper"
  );
  const welcomeShown = useRef(false);

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
      } else {
        showFlash("👋", `Welcome back, ${user.username}!`, "welcome", user.username);
      }
    }
  }, [user]);

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
      {activeTab === "driver" && (
        <NearbyHopperAlert hopper={currentHopper} onDismiss={dismiss} />
      )}

      <div className="flex justify-center pt-4 pb-1 max-w-lg mx-auto px-4" data-testid="mode-switcher">
        <div className="relative flex items-center bg-card/95 backdrop-blur-lg rounded-full border border-orange-400/40 shadow-xl shadow-orange-500/10 p-1">
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
            onClick={() => setActiveTab("hopper")}
            className={`relative z-10 px-7 py-2.5 rounded-full text-xs font-black tracking-wide transition-colors ${
              activeTab === "hopper" ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-hopper"
          >
            🎒 Hopper
          </button>
          <button
            onClick={() => setActiveTab("driver")}
            className={`relative z-10 px-7 py-2.5 rounded-full text-xs font-black tracking-wide transition-colors ${
              activeTab === "driver" ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-driver"
          >
            🚗 Driver
          </button>
        </div>
      </div>

      {activeTab === "driver" ? (
        <DriverDashboard user={user} />
      ) : (
        <WalkerDashboard user={user} />
      )}
    </>
  );
}
