import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import WalkerDashboard from "./WalkerDashboard";
import DriverDashboard from "./DriverDashboard";
import { NearbyHopperAlert } from "@/components/NearbyHopperAlert";
import { useNearbyHopperSimulation } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { Loader2 } from "lucide-react";

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
        showFlash("👋", `Welcome back, ${user.username}!`, "welcome");
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
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex" data-testid="role-tabs">
          <button
            onClick={() => setActiveTab("hopper")}
            className={`flex-1 pb-2 text-sm font-display font-bold text-center transition-colors relative ${
              activeTab === "hopper" ? "text-blue-500" : "text-muted-foreground"
            }`}
            data-testid="tab-hopper"
          >
            Hopper
            {activeTab === "hopper" && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-orange-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("driver")}
            className={`flex-1 pb-2 text-sm font-display font-bold text-center transition-colors relative ${
              activeTab === "driver" ? "text-green-500" : "text-muted-foreground"
            }`}
            data-testid="tab-driver"
          >
            Driver
            {activeTab === "driver" && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-orange-500" />
            )}
          </button>
        </div>
        <div className="border-b border-border/30 -mt-[1px]" />
      </div>

      {activeTab === "driver" && (
        <NearbyHopperAlert hopper={currentHopper} onDismiss={dismiss} />
      )}
      {activeTab === "driver" ? (
        <DriverDashboard user={user} />
      ) : (
        <WalkerDashboard user={user} />
      )}
    </>
  );
}
