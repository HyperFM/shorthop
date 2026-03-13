import { useLocation } from "wouter";
import { Calendar, Zap, Activity, User, Car } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

function getActiveMode(): "hopper" | "driver" {
  try {
    return (localStorage.getItem("sh-active-mode") as "hopper" | "driver") || "hopper";
  } catch {
    return "hopper";
  }
}

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

const tabs = [
  { path: "/community", icon: Activity, label: "Network" },
  { path: "/schedule", icon: Calendar, label: "Schedule" },
  { path: "/instahop", icon: Zap, label: "InstaHop", isHop: true },
  { path: "/dashboard", customIcon: BowTieIcon, label: "Tailor" },
  { path: "/settings", icon: User, label: "Profile", isProfile: true },
];

export function BottomTabBar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useAuth();
  const [hopBounce, setHopBounce] = useState(false);
  const [profileColor, setProfileColor] = useState(getProfileTabColor);
  const [activeMode, setActiveMode] = useState<"hopper" | "driver">(getActiveMode);

  useEffect(() => {
    function onColorChange(e: Event) {
      const color = (e as CustomEvent).detail;
      if (color) setProfileColor(color);
    }
    function onModeChange(e: Event) {
      const mode = (e as CustomEvent).detail as "hopper" | "driver";
      if (mode) setActiveMode(mode);
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg safe-area-bottom"
      data-testid="bottom-tab-bar"
    >
      <div className="h-px bg-gradient-to-r from-orange-500/40 via-orange-400/60 to-orange-500/40" />
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive =
            location === tab.path ||
            (tab.path === "/instahop" && location === "/hop") ||
            (tab.path === "/settings" && location === "/profile");
          const showAdminDot = (tab as any).isProfile && user.isAdmin;
          const Icon = (tab as any).icon as typeof User | undefined;
          const CustomIcon = (tab as any).customIcon as typeof BowTieIcon | undefined;
          const isProfileTab = (tab as any).isProfile;
          const activeColor = isProfileTab && isFlexPlus && isActive ? profileColor : isActive ? "text-orange-500" : "text-muted-foreground";
          const inactiveColor = isProfileTab && isFlexPlus ? profileColor.replace("-500", "-400").replace("-400", "-300") : "";

          if ((tab as any).isHop) {
            const isDriverMode = activeMode === "driver";
            return (
              <motion.button
                key={tab.path}
                onClick={() => {
                  setHopBounce(true);
                  setTimeout(() => setHopBounce(false), 400);
                  setLocation(isDriverMode ? "/dashboard" : "/instahop");
                }}
                animate={hopBounce ? { scale: [1, 1.2, 0.95, 1.05, 1] } : {}}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
                data-testid={isDriverMode ? "tab-drive" : "tab-instahop"}
              >
                {isDriverMode ? (
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 bg-gradient-to-br from-blue-500 to-blue-700 -mt-3">
                    <Car className="w-5 h-5 text-white stroke-[2.5]" />
                  </div>
                ) : (
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center -mt-3 overflow-hidden relative"
                    style={{
                      background: "linear-gradient(135deg, #1a56db 0%, #1e40af 100%)",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.45), 0 0 0 2px rgba(37,99,235,0.25)",
                    }}
                  >
                    <img
                      src="/walker-figure.jpeg"
                      alt="Walk"
                      className="w-9 h-9 object-cover scale-110"
                      style={{ mixBlendMode: "multiply" }}
                    />
                  </div>
                )}
                <span className={`text-[10px] font-bold leading-none ${
                  isDriverMode ? "text-blue-600 dark:text-blue-400" : "text-blue-500 dark:text-blue-400"
                }`}>
                  {isDriverMode ? "Drive" : "Walk"}
                </span>
              </motion.button>
            );
          }

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
                  className={`absolute top-0 inset-x-0 mx-auto w-8 h-0.5 rounded-full ${
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
