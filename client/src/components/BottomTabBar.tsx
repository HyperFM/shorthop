import { useLocation } from "wouter";
import { Calendar, Zap, Activity, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
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

function WalkerFigure({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="white" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="4" r="2.1" fill="white" />
      <path
        d="M10 8.5 C10.5 7.5 11.5 7 13 7 C14.5 7 15.5 7.8 15.5 8.5 L14.5 13.5 L17 19 L15 19.5 L13 15 L11.5 19.5 L9.5 19 L11.5 13.5 Z"
        fill="white"
      />
      <path d="M10 8.5 L7.5 12" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M15.5 8.5 L17.5 11.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function WalkTabButton({ isOnHop, onPress }: { isOnHop: boolean; onPress: () => void }) {
  return (
    <motion.button
      onClick={onPress}
      className="flex flex-col items-center justify-center flex-1 h-full relative"
      data-testid="tab-instahop"
    >
      <AnimatePresence mode="wait">
        {isOnHop ? (
          <motion.div
            key="walk"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.25, ease: "backOut" }}
            className="flex flex-col items-center -mt-3"
          >
            <div className="relative flex items-center justify-center w-14 h-14">
              {/* Outer glow ring — slow pulse */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "rgba(59,130,246,0.15)",
                  animation: "walkRingOuter 2.2s ease-in-out infinite",
                }}
              />
              {/* Middle ring — slightly faster */}
              <div
                className="absolute"
                style={{
                  inset: 4,
                  borderRadius: "50%",
                  border: "2px solid rgba(59,130,246,0.35)",
                  animation: "walkRingMid 2.2s ease-out infinite 0.4s",
                }}
              />
              {/* White glow shadow behind button */}
              <div
                className="absolute"
                style={{
                  inset: 8,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.55)",
                  filter: "blur(6px)",
                }}
              />
              {/* Main blue circle */}
              <div
                className="relative flex items-center justify-center rounded-full"
                style={{
                  width: 42,
                  height: 42,
                  background: "linear-gradient(145deg, #3b82f6, #1d4ed8)",
                  boxShadow:
                    "0 0 0 3px rgba(255,255,255,0.85), 0 0 0 5px rgba(59,130,246,0.25), 0 6px 20px rgba(59,130,246,0.5)",
                }}
              >
                <WalkerFigure size={20} />
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-500 leading-none -mt-1">
              Walk
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="instahop"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.22, ease: "backOut" }}
            className="flex flex-col items-center gap-0.5 -mt-3"
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: "0 4px 14px rgba(34,197,94,0.4)",
              }}
            >
              <Zap className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 leading-none">
              InstaHop
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inject keyframe CSS once */}
      <style>{`
        @keyframes walkRingOuter {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50%       { transform: scale(1.5); opacity: 0.1; }
        }
        @keyframes walkRingMid {
          0%   { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(2.1); opacity: 0; }
        }
      `}</style>
    </motion.button>
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
  { path: "/instahop", label: "InstaHop", isHop: true },
  { path: "/dashboard", customIcon: BowTieIcon, label: "Tailor" },
  { path: "/settings", icon: User, label: "Profile", isProfile: true },
];

export function BottomTabBar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useAuth();
  const [profileColor, setProfileColor] = useState(getProfileTabColor);

  useEffect(() => {
    function onColorChange(e: Event) {
      const color = (e as CustomEvent).detail;
      if (color) setProfileColor(color);
    }
    window.addEventListener("sh-profile-color-change", onColorChange);
    return () => window.removeEventListener("sh-profile-color-change", onColorChange);
  }, []);

  if (!user) return null;

  const isFlexPlus = user.subscription === "flex_hop" || user.subscription === "power_hop";
  const isOnHop = location === "/instahop" || location === "/hop";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg safe-area-bottom"
      data-testid="bottom-tab-bar"
    >
      <div className="h-px bg-gradient-to-r from-orange-500/40 via-orange-400/60 to-orange-500/40" />
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          if ((tab as any).isHop) {
            return (
              <WalkTabButton
                key={tab.path}
                isOnHop={isOnHop}
                onPress={() => setLocation("/instahop")}
              />
            );
          }

          const isActive =
            location === tab.path ||
            (tab.path === "/settings" && location === "/profile");
          const showAdminDot = (tab as any).isProfile && user.isAdmin;
          const Icon = (tab as any).icon as typeof User | undefined;
          const CustomIcon = (tab as any).customIcon as typeof BowTieIcon | undefined;
          const isProfileTab = (tab as any).isProfile;
          const activeColor =
            isProfileTab && isFlexPlus && isActive
              ? profileColor
              : isActive
              ? "text-orange-500"
              : "text-muted-foreground";
          const inactiveColor =
            isProfileTab && isFlexPlus
              ? profileColor.replace("-500", "-400").replace("-400", "-300")
              : "";

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
              <span className={`text-[10px] leading-none ${isActive ? "font-bold" : "font-medium"}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tabIndicator"
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${
                    isProfileTab && isFlexPlus
                      ? profileColor.replace("text-", "bg-")
                      : "bg-orange-500"
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
