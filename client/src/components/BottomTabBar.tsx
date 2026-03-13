import { useLocation } from "wouter";
import { Calendar, Activity, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

function BowTieIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 8 L10 12 L2 16 Z" />
      <path d="M22 8 L14 12 L22 16 Z" />
      <rect x="10" y="10.5" width="4" height="3" rx="1.5" />
    </svg>
  );
}

const PROFILE_TAB_COLORS = [
  { label: "Orange", value: "text-orange-500" },
  { label: "Violet", value: "text-violet-500" },
  { label: "Cyan", value: "text-cyan-500" },
  { label: "Rose", value: "text-rose-500" },
  { label: "Lime", value: "text-lime-500" },
  { label: "Amber", value: "text-amber-400" },
  { label: "Sky", value: "text-sky-500" },
  { label: "Fuchsia", value: "text-fuchsia-500" },
];

export { PROFILE_TAB_COLORS };

function getProfileTabColor(): string {
  try {
    return localStorage.getItem("sh-profile-tab-color") || "text-orange-500";
  } catch {
    return "text-orange-500";
  }
}

const sideTabs = [
  { path: "/community", icon: Activity, label: "Connect" },
  { path: "/schedule", icon: Calendar, label: "Schedule" },
  { path: "/dashboard", customIcon: BowTieIcon, label: "Tailor" },
  { path: "/settings", icon: User, label: "Profile", isProfile: true },
];

function getActiveMode(): "hopper" | "driver" {
  try {
    return localStorage.getItem("sh-active-tab") === "driver" ? "driver" : "hopper";
  } catch { return "hopper"; }
}

export function BottomTabBar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useAuth();
  const [profileColor, setProfileColor] = useState(getProfileTabColor);
  const [activeMode, setActiveMode] = useState(getActiveMode);

  useEffect(() => {
    function onColorChange(e: Event) {
      const color = (e as CustomEvent).detail;
      if (color) setProfileColor(color);
    }
    function onModeChange(e: Event) {
      const mode = (e as CustomEvent).detail;
      setActiveMode(mode === "driver" ? "driver" : "hopper");
    }
    window.addEventListener("sh-profile-color-change", onColorChange);
    window.addEventListener("sh-mode-change", onModeChange);
    return () => {
      window.removeEventListener("sh-profile-color-change", onColorChange);
      window.removeEventListener("sh-mode-change", onModeChange);
    };
  }, []);

  if (!user) return null;

  const isFlexPlus = user.subscription === "flex_hop" || user.subscription === "power_hop";
  const isOnHopPage = location === "/instahop" || location === "/hop";

  function switchToHopper() {
    localStorage.setItem("sh-active-tab", "hopper");
    window.dispatchEvent(new CustomEvent("sh-mode-change", { detail: "hopper" }));
    setActiveMode("hopper");
    setLocation("/instahop");
  }

  function switchToDriver() {
    localStorage.setItem("sh-active-tab", "driver");
    window.dispatchEvent(new CustomEvent("sh-mode-change", { detail: "driver" }));
    setActiveMode("driver");
    setLocation("/instahop");
  }

  const leftTabs = sideTabs.slice(0, 2);
  const rightTabs = sideTabs.slice(2);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg safe-area-bottom"
      data-testid="bottom-tab-bar"
    >
      <div className="h-px bg-gradient-to-r from-orange-500/40 via-orange-400/60 to-orange-500/40" />
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {leftTabs.map((tab) => {
          const isActive = location === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                isActive ? "text-orange-500" : "text-muted-foreground"
              }`}
              data-testid={`tab-${tab.label.toLowerCase()}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] leading-none ${isActive ? "font-bold" : "font-medium"}`}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-500"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}

        <div className="flex items-center gap-1 flex-1 justify-center h-full" data-testid="tab-instahop">
          <button
            onClick={switchToHopper}
            className={`flex flex-col items-center justify-center gap-0.5 relative`}
            data-testid="tab-hop-hopper"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md -mt-2 transition-all ${
              activeMode === "hopper" && isOnHopPage
                ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30 ring-2 ring-blue-400/50"
                : "bg-muted/80 shadow-none"
            }`}>
              <img src="/hopper-btn.png" alt="Hop" className="w-7 h-7 object-contain" />
            </div>
            <span className={`text-[9px] leading-none mt-0.5 ${
              activeMode === "hopper" && isOnHopPage ? "text-blue-600 dark:text-blue-400 font-bold" : "text-muted-foreground font-medium"
            }`}>Hop</span>
          </button>

          <button
            onClick={switchToDriver}
            className={`flex flex-col items-center justify-center gap-0.5 relative`}
            data-testid="tab-hop-driver"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md -mt-2 transition-all ${
              activeMode === "driver" && isOnHopPage
                ? "bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/30 ring-2 ring-orange-400/50"
                : "bg-muted/80 shadow-none"
            }`}>
              <img src="/driver-btn.png" alt="Drive" className="w-7 h-7 object-contain" />
            </div>
            <span className={`text-[9px] leading-none mt-0.5 ${
              activeMode === "driver" && isOnHopPage ? "text-orange-600 dark:text-orange-400 font-bold" : "text-muted-foreground font-medium"
            }`}>Drive</span>
          </button>
        </div>

        {rightTabs.map((tab) => {
          const isActive = location === tab.path || ((tab as any).isProfile && location === "/profile");
          const showAdminDot = (tab as any).isProfile && user.isAdmin;
          const Icon = tab.icon as typeof User | undefined;
          const CustomIcon = (tab as any).customIcon as typeof BowTieIcon | undefined;
          const isProfileTab = (tab as any).isProfile;
          const activeColor = isProfileTab && isFlexPlus && isActive ? profileColor : isActive ? "text-orange-500" : "text-muted-foreground";
          const inactiveColor = isProfileTab && isFlexPlus ? profileColor.replace("-500", "-400").replace("-400", "-300") : "";

          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                isActive ? activeColor : inactiveColor || "text-muted-foreground"
              }`}
              data-testid={`tab-${tab.label.toLowerCase()}`}
            >
              {CustomIcon ? (
                <CustomIcon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              ) : Icon ? (
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              ) : null}
              <span className={`text-[10px] leading-none ${isActive ? "font-bold" : "font-medium"}`}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tabIndicator"
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${
                    isProfileTab && isFlexPlus ? profileColor.replace("text-", "bg-") : "bg-orange-500"
                  }`}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              {showAdminDot && (
                <div className="absolute top-2 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
